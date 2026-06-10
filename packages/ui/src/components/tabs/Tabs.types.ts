export interface Tab {
  key: string;
  label: string;
  badge?: number;
}

export interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
}
