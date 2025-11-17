import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetClose, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { CategoryManager } from './CategoryManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { loadSettings, saveSettings } from '@/lib/settings';
import { CURRENCY_OPTIONS, AppSettings } from '@/types/settings';
import { exportData } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { format } from 'date-fns/format';
import Menu from 'lucide-react/dist/esm/icons/menu';
import Download from 'lucide-react/dist/esm/icons/download';
import X from 'lucide-react/dist/esm/icons/x';
import Crown from 'lucide-react/dist/esm/icons/crown';
import { toast } from 'sonner';
import { ViewType } from '@/lib/dateUtils';
import { useLocation } from 'react-router-dom';

interface SettingsSheetProps {
  onSettingsChange: (newView?: ViewType) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBudgetClick?: () => void;
}

export const SettingsSheet = ({ onSettingsChange, open: externalOpen, onOpenChange: externalOnOpenChange, onBudgetClick }: SettingsSheetProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const location = useLocation();
  
  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [settings, setSettings] = useState<AppSettings>({
    categories: [],
    currency: CURRENCY_OPTIONS[0],
    defaultView: 'monthly',
    theme: 'system',
  });
  
  const { user, signOut } = useAuth();
  const { hasActiveSubscription, expiryDate } = useSubscription();

  useEffect(() => {
    const loadData = async () => {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
    };
    loadData();
  }, []);

  const handleCurrencyChange = async (currencyCode: string) => {
    const currency = CURRENCY_OPTIONS.find(c => c.code === currencyCode);
    if (currency) {
      const newSettings = { ...settings, currency };
      await saveSettings(newSettings);
      setSettings(newSettings);
      onSettingsChange();
      toast.success('Currency updated');
    }
  };

  const handleViewChange = async (view: ViewType) => {
    const newSettings = { ...settings, defaultView: view };
    
    // Immediately update UI (instant visual feedback)
    setSettings(newSettings);
    onSettingsChange(view); // Pass view to update immediately
    toast.success('Default view updated');
    
    // Save to DB in background (non-blocking)
    saveSettings(newSettings);
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };


  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="transition-smooth relative">
          <Menu className="w-5 h-5" />
          {hasActiveSubscription && (
            <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" hideClose className="h-screen w-full overflow-y-auto p-6 !border-none">
        <SheetTitle className="sr-only">Settings</SheetTitle>
        <div className="flex items-center justify-between mb-6">
          <ThemeToggle />
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <X className="h-6 w-6" />
            </Button>
          </SheetClose>
        </div>

        {hasActiveSubscription && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 justify-center">
              <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-foreground">Premium Member</span>
            </div>
          </div>
        )}
        
        <h2 className="text-xl font-semibold mb-4">Settings</h2>

        <Accordion type="multiple" defaultValue={[]} className="mt-2">
          <AccordionItem value="categories">
            <AccordionTrigger className="text-base font-medium">Categories</AccordionTrigger>
            <AccordionContent className="pt-4">
              <CategoryManager onCategoriesChange={onSettingsChange} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="preferences">
            <AccordionTrigger className="text-base font-medium">Preferences</AccordionTrigger>
            <AccordionContent className="pt-4 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Currency</Label>
                <Select value={settings.currency.code} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Default View</Label>
                <RadioGroup value={settings.defaultView} onValueChange={(v) => handleViewChange(v as ViewType)}>
                  <div className="flex items-center space-x-2 py-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily" className="font-normal cursor-pointer">Daily</Label>
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly" className="font-normal cursor-pointer">Weekly</Label>
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="font-normal cursor-pointer">Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <RadioGroupItem value="yearly" id="yearly" />
                    <Label htmlFor="yearly" className="font-normal cursor-pointer">Yearly</Label>
                  </div>
                </RadioGroup>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="budget" className="border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="text-base font-medium">Budget Settings</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <Button
                onClick={() => {
                  setOpen(false);
                  onBudgetClick?.();
                }}
                variant="outline"
                className="w-full justify-start"
              >
                Manage Monthly Budget
              </Button>
            </AccordionContent>
          </AccordionItem>

          <Separator className="my-2" />

          <AccordionItem value="categories" className="border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏷️</span>
                <span className="text-base font-medium">Categories</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <CategoryManager onCategoriesChange={() => {}} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="preferences">
            <AccordionTrigger className="text-base font-medium">Preferences</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={settings.currency.code} onValueChange={(value) => handleCurrencyChange(value as "INR" | "USD" | "EUR" | "GBP")}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultView">Default View</Label>
                  <Select value={settings.defaultView} onValueChange={handleViewChange}>
                    <SelectTrigger id="defaultView">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data">
            <AccordionTrigger className="text-base font-medium">Data</AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Export Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download all your transactions and settings as a JSON file.
                </p>
                <Button onClick={handleExport} className="w-full transition-smooth hover-lift">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>

            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {user && (
          <div className="mt-6 space-y-4">
            <div className="text-sm text-muted-foreground">
              Signed in as: <span className="font-medium text-foreground">{user.email}</span>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSignOut} 
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};