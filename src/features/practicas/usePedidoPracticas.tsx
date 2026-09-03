import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileDown, Printer, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generarRecetaPDF } from "@/lib/pdf";
import { armarLinkWhatsAppTexto } from "@/lib/whatsapp";
import { armarLinkYahooMail } from "@/lib/email";
import { datosMedicoReceta } from "@/services/perfil";
import { listPlantillas } from "@/services/plantillas";
import {
  agruparPorSeccion,
  idsPracticasUsadas,
  listPracticas,
  practicasOrdenadasPorUso,
  practicasParaObraSocial,
  registrarUsoPractica,
} from "@/services/practicas";
import type { Paciente, PracticaEstudio } from "@/types/domain";

export const TITULOS_PEDIDO: Record<string, string> = {
  "Estudios y Prácticas": "Pedido de estudios",
  Laboratorio: "Pedido de laboratorio",
  "Otros estudios complementarios": "Pedido de estudios complementarios",
  Cirugías: "Pedido de cirugía",
};

/**
 * Lógica compartida de "pedido de prácticas": elegir prácticas de una sección
 * para un paciente, generar el PDF e imprimirlo / enviarlo.
 */
export function usePedidoPracticas(paciente: Paciente | null) {
  const plantillas = useQuery({ queryKey: ["plantillas"], queryFn: listPlantillas });
  const practicas = useQuery({ queryKey: ["practicas"], queryFn: listPracticas });

  const [pedidoAbierto, setPedidoAbierto] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [ordenPedido, setOrdenPedido] = useState<PracticaEstudio[] | null>(null);
  const [pedidoListo, setPedidoListo] = useState<{ contenido: string; fecha: Date; titulo: string } | null>(null);
  const [usadasAntes, setUsadasAntes] = useState<string[]>([]);
  const [seccionPedido, setSeccionPedido] = useState<string>("Estudios y Prácticas");

  const basePracticas = practicasParaObraSocial(practicas.data ?? [], paciente?.obra_social ?? null);
  const tituloPedido = TITULOS_PEDIDO[seccionPedido] ?? "Pedido de estudios";
  const disponibles = (ordenPedido ?? basePracticas).filter((p) => p.seccion === seccionPedido);

  const abrirPedido = (seccion: string) => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    setSeccionPedido(seccion);
    setSeleccionadas([]);
    setOrdenPedido(null);
    setUsadasAntes([]);
    setPedidoAbierto(true);
    void (async () => {
      try {
        const [ordenadas, usados] = await Promise.all([
          practicasOrdenadasPorUso(basePracticas, paciente.id),
          idsPracticasUsadas(paciente.id),
        ]);
        setOrdenPedido(ordenadas);
        setUsadasAntes(usados);
      } catch (e) {
        console.error(e);
      }
    })();
  };

  const generarPedido = () => {
    if (!paciente || seleccionadas.length === 0) return;
    const elegidas = disponibles.filter((p) => seleccionadas.includes(p.id));
    const contenido = elegidas.map((p) => p.contenido).join("\n\n");
    setPedidoAbierto(false);
    const fecha = new Date();
    setPedidoListo({ contenido, fecha, titulo: tituloPedido });
    void (async () => {
      const medico = await datosMedicoReceta();
      await generarRecetaPDF({
        paciente,
        contenido,
        fecha,
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        titulo: tituloPedido,
        formato: "a5",
      });
      // Memoria de uso: no debe interrumpir la generación del PDF.
      await Promise.all(
        elegidas.map((p) => registrarUsoPractica(p.id, paciente.id).catch((e: unknown) => console.error(e))),
      );
    })();
  };

  const dialogos = (
    <>
      <Dialog open={pedidoAbierto} onOpenChange={setPedidoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tituloPedido}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {paciente?.obra_social ? `Obra social: ${paciente.obra_social}` : "Paciente particular / sin obra social"}
          </p>
          <div className="max-h-72 space-y-3 overflow-y-auto">
            {disponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay prácticas cargadas. Agregalas en la pantalla “Prácticas y estudios”.
              </p>
            ) : null}
            {agruparPorSeccion(disponibles).map(([seccion, subgrupos]) => (
              <div key={seccion} className="space-y-3">
                <p className="text-sm font-semibold">{seccion}</p>
                {subgrupos.map(([sub, items]) => (
                  <div key={sub} className="space-y-2 pl-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{sub}</p>
                    {items.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-start gap-3 text-sm">
                        <Checkbox
                          checked={seleccionadas.includes(p.id)}
                          onCheckedChange={(v) =>
                            setSeleccionadas((prev) => (v ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
                          }
                        />
                        <span className="min-w-0">
                          <span className="font-medium">{p.nombre}</span>
                          {p.codigo ? <span className="ml-2 text-xs text-muted-foreground">{p.codigo}</span> : null}
                          {usadasAntes.includes(p.id) ? (
                            <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                              Pedido antes
                            </span>
                          ) : null}
                          <span className="block text-xs text-muted-foreground">{p.contenido}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPedidoAbierto(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={generarPedido} disabled={seleccionadas.length === 0}>
              <FileDown className="size-4" /> Generar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pedidoListo !== null} onOpenChange={(v) => (v ? null : setPedidoListo(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pedidoListo?.titulo ?? "Pedido de estudios"} generado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El PDF ya se descargó. También podés imprimirlo o avisarle al paciente por WhatsApp (el aviso es solo texto:
            el PDF no se adjunta automáticamente).
          </p>
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!paciente || !pedidoListo) return;
                void (async () => {
                  const medico = await datosMedicoReceta();
                  await generarRecetaPDF(
                    {
                      paciente,
                      contenido: pedidoListo.contenido,
                      fecha: pedidoListo.fecha,
                      plantilla: plantillas.data?.[0] ?? null,
                      medico,
                      titulo: pedidoListo.titulo,
                      formato: "a5",
                    },
                    { modo: "imprimir" },
                  );
                })();
              }}
            >
              <Printer className="size-4" /> Imprimir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!paciente || !pedidoListo) return;
                void (async () => {
                  const medico = await datosMedicoReceta();
                  await generarRecetaPDF({
                    paciente,
                    contenido: pedidoListo.contenido,
                    fecha: pedidoListo.fecha,
                    plantilla: plantillas.data?.[0] ?? null,
                    medico,
                    titulo: pedidoListo.titulo,
                    formato: "a5",
                  });
                })();
              }}
            >
              <FileDown className="size-4" /> Descargar
            </Button>
            {paciente?.telefono ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!paciente?.telefono || !pedidoListo) return;
                  const mensaje = `Hola ${paciente.nombre}, tiene listo su pedido de estudios de ${pedidoListo.fecha.toLocaleDateString("es-AR")}. Puede pasar a buscarlo o coordinar el envío por este medio.`;
                  window.open(armarLinkWhatsAppTexto(paciente.telefono, mensaje), "_blank", "noopener,noreferrer");
                }}
              >
                <MessageCircle className="size-4" /> Enviar por WhatsApp
              </Button>
            ) : null}
            {paciente?.email ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!paciente?.email || !pedidoListo) return;
                  const asunto = `Pedido de estudios - ${paciente.apellido}, ${paciente.nombre}`;
                  const cuerpo = `Hola ${paciente.nombre}, tiene listo su pedido de estudios de ${pedidoListo.fecha.toLocaleDateString("es-AR")}. Puede pasar a buscarlo o coordinar el envío por este medio.`;
                  window.open(armarLinkYahooMail(paciente.email, asunto, cuerpo), "_blank", "noopener,noreferrer");
                }}
              >
                <Mail className="size-4" /> Enviar por email
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setPedidoListo(null)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return { abrirPedido, dialogos };
}
