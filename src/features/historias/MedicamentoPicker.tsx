import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pill } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { lineaTratamiento, listMedicamentos } from "@/services/medicamentos";

interface Props {
  onAgregar: (linea: string) => void;
}

export function MedicamentoPicker({ onAgregar }: Props) {
  const [open, setOpen] = useState(false);
  const medicamentos = useQuery({ queryKey: ["medicamentos"], queryFn: () => listMedicamentos("") });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
          <Pill className="size-4" /> Buscar y agregar medicamento
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(28rem,90vw)] p-0">
        <Command>
          <CommandInput placeholder="Escribí el nombre del medicamento…" />
          <CommandList>
            <CommandEmpty>
              {medicamentos.isLoading ? "Cargando…" : "No se encontraron medicamentos."}
            </CommandEmpty>
            <CommandGroup>
              {(medicamentos.data ?? []).map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.nombre}
                  onSelect={() => {
                    onAgregar(lineaTratamiento(m));
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{m.nombre}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[m.dosis, m.posologia].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
