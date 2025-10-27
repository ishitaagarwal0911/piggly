import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { CategoryManager } from './CategoryManager';
import { loadSettings, saveSettings } from '@/lib/settings';
import { CURRENCY_OPTIONS, CurrencyOption } from '@/types/settings';
import { exportData, importData, importCSV } from '@/lib/storage';
import { Menu, Download, Upload, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { ViewType } from '@/lib/dateUtils';
import { useTheme } from 'next-themes';

interface SettingsSheetProps {
  onSettingsChange: () => void;
}

export const SettingsSheet = ({ onSettingsChange }: SettingsSheetProps) => {
  const [open, setOpen] = useState(false);
  const settings = loadSettings();
  const { theme, setTheme } = useTheme();

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = CURRENCY_OPTIONS.find(c => c.code === currencyCode);
    if (currency) {
      const newSettings = { ...settings, currency };
      saveSettings(newSettings);
      onSettingsChange();
      toast.success('Currency updated');
    }
  };

  const handleViewChange = (view: ViewType) => {
    const newSettings = { ...settings, defaultView: view };
    saveSettings(newSettings);
    onSettingsChange();
    toast.success('Default view updated');
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    const newSettings = { ...settings, theme: newTheme as 'light' | 'dark' | 'system' };
    saveSettings(newSettings);
    toast.success('Theme updated');
  };

  const handleExport = () => {
    try {
      const data = exportData();
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
          result = importCSV(text);
        } else {
          result = importData(text);
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="transition-smooth">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="categories" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4 mt-6">
            <CategoryManager onCategoriesChange={onSettingsChange} />
          </TabsContent>

          <TabsContent value="preferences" className="mt-6 space-y-6">
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">Theme</Label>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Light</span>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => handleThemeChange(checked ? 'dark' : 'light')}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm">Dark</span>
                  <Moon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4 mt-6">
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
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
