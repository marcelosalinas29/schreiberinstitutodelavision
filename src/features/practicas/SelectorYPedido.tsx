import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listPacientes } from "@/services/pacientes";
import { TITULOS_PEDIDO, usePedidoPracticas } from "@/features/practicas/usePedidoPracticas";

interface Props {
  /** Sección de prácticas que se ofrece para el pedido. */
  seccion: string;
}

/** Buscador de paciente + generación del pedido de esa sección, fuera de Historia Clínica. */
export function SelectorYPedido({ seccion }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const pacientes = useQuery({ queryKey: ["pacientes", busqueda], queryFn: () => listPacientes(busqueda) });
  const paciente = (pacientes.data ?? []).find((p) => p.id === pacienteId) ?? null;
  const { abrirPedido, dialogos } = usePedidoPracticas(paciente);
  const titulo = TITULOS_PEDIDO[seccion] ?? "Pedido de estudios";

  return (
    <section className="panel mb-4 space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <p className="text-xs text-muted-foreground">
          Elegí un paciente y generá el pedido sin pasar por Historia Clínica.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="buscar-paciente">Buscar paciente</Label>
          <Input
            id="buscar-paciente"
            placeholder="Nombre, apellido o DNI"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Paciente</Label>
          <Select value={pacienteId} onValueChange={setPacienteId}>
            <SelectTrigger>
              <SelectValue placeholder="Elegí un paciente" />
            </SelectTrigger>
            <SelectContent>
              {(pacientes.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre} {p.dni ? `· ${p.dni}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button size="sm" onClick={() => abrirPedido(seccion)} disabled={!paciente}>
        <ClipboardList className="size-4" /> {titulo}
      </Button>

      {dialogos}
    </section>
  );
}
