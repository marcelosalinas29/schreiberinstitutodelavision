import { Palette, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEMES, useTheme } from "@/features/theme/ThemeProvider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label="Cambiar tema visual">
          <Palette className="size-4" />
          <span className="hidden sm:inline">Tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Tema visual</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((item) => (
          <DropdownMenuItem key={item.id} onSelect={() => setTheme(item.id)} className="gap-2">
            <span className="flex-1">
              <span className="block text-sm">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.hint}</span>
            </span>
            {theme === item.id ? <Check className="size-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
