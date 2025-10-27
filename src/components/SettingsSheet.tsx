import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CategoryManager } from './CategoryManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { loadSettings, saveSettings } from '@/lib/settings';
import { CURRENCY_OPTIONS, AppSettings } from '@/types/settings';
import { exportData, importData, importCSV } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ViewType } from '@/lib/dateUtils';

interface SettingsSheetProps {
  onSettingsChange: () => void;
}

export const SettingsSheet = ({ onSettingsChange }: SettingsSheetProps) => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    categories: [],
    currency: CURRENCY_OPTIONS[0],
    defaultView: 'monthly',
    theme: 'system',
  });
  const { user, signOut } = useAuth();

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
    await saveSettings(newSettings);
    setSettings(newSettings);
    onSettingsChange();
    toast.success('Default view updated');
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

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        let result;
        
        if (file.name.endsWith('.csv')) {
          result = await importCSV(text);
        } else {
          result = await importData(text);
        }
        
        if (result.success) {
          toast.success(`Successfully imported ${result.transactions} transactions`);
          onSettingsChange();
          setOpen(false);
        } else {
          toast.error(result.error || 'Failed to import data');
        }
      } catch (error) {
        toast.error('Failed to read file');
      }
    };
    input.click();
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
        <Button variant="ghost" size="sm" className="transition-smooth">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between pb-4">
          <ThemeToggle />
        </SheetHeader>

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
                </RadioGroup>
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

              <div>
                <h3 className="text-sm font-medium mb-2">Import Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Restore your data from a JSON or CSV file. CSV format: date,amount,type,category,note
                </p>
                <Button onClick={handleImport} variant="outline" className="w-full transition-smooth">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {user && (
          <div className="mt-6 pt-6 border-t space-y-4">
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