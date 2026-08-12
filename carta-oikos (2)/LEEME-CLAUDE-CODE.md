# Carta Oikos — assets listos para integrar

Este paquete contiene la carta completa ordenada por categorías, con fotos
recortadas (sin el texto superpuesto) y optimizadas para web.

## Contenido

```
menu.json                             <- datos de TODA la carta (11 categorías)
images/carta/placeholder-default.jpg  <- imagen por defecto para items sin foto real
images/carta/churrasco/*.jpg          <- 12 fotos
images/carta/ave/*.jpg                <- 12 fotos
images/carta/mechada/*.jpg            <- 8 fotos
images/carta/lomo/*.jpg               <- 12 fotos
images/carta/al-plato/*.jpg           <- 4 fotos
images/carta/pizzas/*.jpg             <- 12 fotos
images/carta/cafeteria/*.jpg          <- 8 fotos
images/carta/postres/*.jpg            <- 9 fotos
images/carta/papas-y-snacks/*.jpg     <- 8 fotos
images/carta/tragos-y-cocteles/*.jpg  <- 6 fotos
images/carta/almuerzos/*.jpg          <- 1 foto real (Pollo Asado); el resto
                                          usa el placeholder por defecto
```

Total: **115 productos** en 11 categorías.

## ⚠️ Categoría "Almuerzos"

Esta sección todavía no tiene fotos propias de cada plato — en el Drive
original solo venía el logo de Oikos repetido. Por eso **todos los items de
"Almuerzos" apuntan a `placeholder-default.jpg`, excepto "Pollo Asado con
Papas Fritas"**, que sí tenía una foto real y quedó recortada normalmente.
Cuando tengas las fotos de los demás platos de almuerzo, mándamelas y
actualizo el JSON.

## Estructura de menu.json

Cada item tiene `id`, `nombre`, `descripcion`, `imagen`, y uno de estos
esquemas de precio (según cómo se vendía el producto):

- **Precio único**: `"precio": 4500`
- **Individual / Grande** (pizzas, papas fritas): `"precioIndividual": 7250, "precioGrande": 11950`
- **Por dos unidades** (tragos, cervezas, jugos): `"precioX2": 10950`
- **Sin precio definido todavía** (ej. Pastel de Choclo): `"precio": null`

```json
{
  "carta": [
    {
      "categoria": "Churrascos",
      "slug": "churrasco",
      "items": [
        {
          "id": "barros-jarpa",
          "nombre": "Barros Jarpa",
          "descripcion": "Pan frica 100% artesanal, con queso y jamón.",
          "precio": 4500,
          "imagen": "/images/carta/churrasco/barros-jarpa.jpg"
        }
      ]
    },
    {
      "categoria": "Pizzas",
      "slug": "pizzas",
      "items": [
        {
          "id": "napolitana",
          "nombre": "Napolitana",
          "descripcion": "Salsa pomodoro, jamón, queso gauda, aceitunas y orégano.",
          "precioIndividual": 7250,
          "precioGrande": 11950,
          "imagen": "/images/carta/pizzas/napolitana.jpg"
        }
      ]
    }
  ]
}
```

## Instrucciones para Claude Code

1. Copia la carpeta `images/carta/` completa dentro de la carpeta `public/`
   del proyecto (o `static/`, según el framework que uses), de modo que las
   rutas de `menu.json` (`/images/carta/...`) apunten correctamente.
2. Copia `menu.json` a donde el proyecto guarde datos (ej: `src/data/menu.json`
   o `data/menu.json`).
3. Crea/actualiza la sección "Carta" o "Menú" de la web para que:
   - Recorra `menu.json` y muestre una sección por cada categoría
     (`categoria` como título de sección, en el orden en que aparecen en el
     arreglo).
   - Dentro de cada categoría, muestre una grilla de tarjetas de producto
     (imagen, nombre, descripción breve).
   - Formatee el precio según qué campos tenga el item:
     - si tiene `precio`: mostrar `$4.500` (o "Consultar" si es `null`)
     - si tiene `precioIndividual`/`precioGrande`: mostrar "Individual $7.250 · Grande $11.950"
     - si tiene `precioX2`: mostrar "2x $10.950"
   - Sea responsive (grilla de 4 columnas en desktop, 2 en tablet, 1 en mobile).
4. Usa el mismo estilo visual llamativo de tarjetas redondeadas con sombra
   suave que se definió para el resto del sitio (colores cálidos, bordes
   redondeados, buen contraste).
5. Si el proyecto usa Next.js/React, crea un componente reutilizable
   `MenuCard` y otro `MenuSection` que reciban los datos desde `menu.json`
   para que sea fácil agregar/quitar productos después sin tocar el código.

## Notas

- Las fotos fueron recortadas automáticamente para eliminar el texto que
  traían superpuesto en las capturas originales; algunas pueden beneficiarse
  de un recorte manual fino si el encuadre no quedó perfecto.
- Los precios están en pesos chilenos (CLP), como enteros (ej: 4500 = $4.500).
- Faltan categorías/productos por agregar más adelante: cuando tengas las
  imágenes nuevas, se pueden sumar directamente como nuevos objetos dentro
  del arreglo `items` de la categoría correspondiente en `menu.json`.
