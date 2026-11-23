# Prompts Front Sprint 3 para Figma Make

Este documento contiene prompts independientes para desarrollar en Figma Make
las historias de usuario del Sprint 3 del frontend de ImpulsaFund.

Contexto común

- Implementar sobre el proyecto React + Vite + TypeScript + Tailwind CSS v4
  existente.
- Reutilizar `src/App.tsx`, `src/components/Navbar.tsx`,
  `src/components/Footer.tsx`, `src/services/api.ts`, `src/types.ts` y
  las pantallas de `src/screens/`.
- Mantener la navegación global y el diseño visual existente.
- Mantener autenticación basada en cookie `AUTH_SESSION` con
  `credentials: "include"`.
- Usar `ApiError`, `apiErrorMessage` y los estados existentes de carga, error
  vacío y éxito.
- No reemplazar el backend ni crear una aplicación paralela.
- Si el backend todavía no está disponible en Figma Make, crear fixtures/mock
  locales con exactamente los nombres y formas de datos documentados.
- Separar los mocks del servicio real para que puedan eliminarse sin reescribir
  las pantallas.
- Diseñar primero desktop de 1440 px y validar mobile de 375 px.
- Conservar radios, espaciado, tipografía, sombras y componentes Tailwind del
  Sprint 2.
- Garantizar labels asociados, foco visible, contraste, navegación por teclado,
  botones con estados idle/loading/disabled/error/success y mensajes legibles.
- Usar errores inline junto al campo y banners/toasts únicamente para errores
  generales o éxito.
- No almacenar contraseñas, tarjetas, tokens ni datos bancarios en
  `localStorage`.
- No usar datos hardcodeados como fuente de verdad si existe una respuesta API.

Sistema visual común

- Aplicar identidad moderna de ImpulsaFund: fondo claro, tarjetas blancas,
  bordes suaves, sombras discretas y acentos `primary`.
- Mantener nombres de frames descriptivos. Ejemplos:
  `S3_HU212_FundingModel_Default`,
  `S3_HU213_Reward_SoldOut`.
- Conectar los frames mediante prototipo navegable.
- No presentar validaciones como un solo alert global si existen campos
  corregibles.

---

## Prompt 1 — HU 2.1.2: Configuración del modelo de recaudación

```text
Actúa como desarrollador frontend senior en Figma Make. Implementa únicamente
la interfaz de la HU 2.1.2 en el frontend React + TypeScript existente.

Antes de editar, inspecciona:

- `src/screens/CreateCampaign.tsx`
- `src/screens/CampaignPage.tsx`
- `src/screens/CreatorDashboard.tsx`
- `src/types.ts`
- `src/services/api.ts`
- `src/App.tsx`
- `src/components/Navbar.tsx`

Historia

Como creador, quiero elegir el modelo de financiación de mi campaña
(Flexible o Fijo), para adaptar la recaudación a la estructura de costos.

Criterios visuales y funcionales

1. El creador puede seleccionar `Fijo` o `Flexible` dentro de la creación
   de una campaña.
2. Fijo explica que los fondos se retienen y se reembolsan si no se alcanza
   la meta.
3. Flexible explica que los fondos recaudados pueden consolidarse aunque no se
   alcance una meta completa.
4. Guardar el borrador conserva la selección.
5. Publicar la campaña conserva el modelo seleccionado.
6. El creador puede consultar el modelo después de publicar.
7. La edición solo permite cambiar el modelo antes de iniciar aportes o según
   las reglas devueltas por el backend.

Pantallas y frames

Agregar o actualizar en `CreateCampaign`:

1. `S3_HU212_Create_Default`
   - Mantener el formulario actual.
   - Agregar una sección "Modelo de recaudación" dentro de la sección de
     financiamiento o como paso independiente.
   - Mostrar dos tarjetas grandes tipo radio:
     - Fijo.
     - Flexible.
   - Fijo seleccionado por defecto solo si el backend no devuelve otro modelo.
   - Ambas opciones deben tener label, descripción corta e icono simple.
   - Mantener el diseño en una sola columna en mobile.

2. `S3_HU212_Create_FlexibleSelected`
   - Mostrar resaltada la tarjeta Flexible.
   - Explicación visual: "Conservas los fondos recaudados al finalizar,
     siempre que exista al menos un aporte."
   - Mostrar el radio seleccionado mediante marca y borde primario.

3. `S3_HU212_Create_FixedSelected`
   - Mostrar resaltada la tarjeta Fijo.
   - Explicación: "Los aportes quedan retenidos hasta cerrar la campaña.
     Si no alcanzas la meta, se reembolsan."

4. `S3_HU212_SaveLoading`
   - Deshabilitar selección y botones durante guardar/publicar.
   - Mostrar "Guardando modelo..." o "Publicando..."
   - Mantener la selección visible.

5. `S3_HU212_SaveError`
   - Error inline si el backend rechaza `FUNDING_MODEL_INVALID`.
   - Mostrar error general si falla la API.
   - No reemplazar la selección por un estado vacío.

6. `S3_HU212_Published`
   - Mostrar una lectura clara del modelo en la campaña publicada.
   - Agregar una sección o badge en `CampaignPage`:
     - "Modelo fijo".
     - "Modelo flexible".
   - La edición posterior debe deshabilitar o ocultar el cambio si el backend
     indica conflicto.

Estados visuales adicionales

- Fixed en progreso: badge amarillo "Fondos retenidos".
- Fixed exitoso: badge verde "Meta alcanzada".
- Fixed fallido: badge gris/rojo "Meta no alcanzada".
- Flexible con aportes: badge verde "Aportes consolidados".
- Modelo desconocido del backend: no mostrar texto incorrecto; usar
  "Modelo no disponible" y error controlado.

Tipos TypeScript

Extender los tipos existentes:

```ts
export type FundingModel = 'FIXED' | 'FLEXIBLE'

interface Campaign {
  // campos existentes...
  fundingModel: FundingModel
}

interface CampaignSummary {
  // campos existentes...
  fundingModel: FundingModel
}

interface Draft {
  // campos existentes...
  fundingModel: FundingModel
}

interface DraftPayload {
  // campos existentes...
  fundingModel: FundingModel
}
```

Integración API

Agregar o reutilizar métodos:

- `PUT /api/drafts/{draftId}` guarda `fundingModel`.
- `POST /api/drafts/{draftId}/publish`.
- `PATCH /api/campaigns/{campaignId}/funding-model` para cambios explícitos.

Body de borrador:

```json
{
  "fundingModel": "FIXED"
}
```

Respuestas exitosas deben incluir `fundingModel`.

Errores:

- `400 VALIDATION_ERROR`: mostrar error inline.
- `401`: cerrar sesión o redirigir a login.
- `403`: mostrar que solo el creador propietario puede editar.
- `404`: campaña/borrador inexistente.
- `409`: explicar que el modelo no puede cambiar porque ya hay aportes o la
  campaña terminó.
- Error de red: mostrar reintento sin afirmar que se guardó.

Validación frontend

- El valor solo puede ser `FIXED` o `FLEXIBLE`.
- No enviar `fundingModel: ""`.
- Conservar el valor recibido hasta validar la API.
- Deshabilitar guardar si no hay usuario creador activo.
- No enviar campos ajenos como `creatorId`, `campaignId` o `status`.

Accesibilidad

- Usar `<fieldset>` y `<legend>`.
- Usar radios reales o botones con `role="radio"` y navegación por teclado.
- Asociar descripción al radio mediante `aria-describedby`.
- Foco visible en ambas tarjetas.
- Anunciar cambios de selección.
- Mantener contraste de texto en las tarjetas deshabilitadas.

Entregables

- Formulario de creación actualizado.
- Estado fijo/flexible con dos tarjetas navegables.
- Visualización del modelo en detalle y resumen.
- Manejo de loading, éxito, validación, conflicto y sesión expirada.
- Fixtures desktop y mobile.
- Prueba visual de no cambiar modelo después de aportes.
- No implementar suscripciones, recompensas, FAQ ni reembolsos en esta pantalla.
```

---

## Prompt 2 — HU 2.1.3: Niveles de patrocinio

```text
Actúa como desarrollador frontend senior en Figma Make. Implementa en el
frontend existente la HU 2.1.3: niveles de patrocinio/recompensas.

Antes de editar inspecciona `CreateCampaign.tsx`, `CampaignPage.tsx`,
`PaymentFlow.tsx`, `types.ts`, `services/api.ts` y `App.tsx`.

Historia

Como creador, quiero definir recompensas o niveles asignando monto mínimo,
fecha estimada y cupo limitado.

Actualizar creación y edición

En `CreateCampaign`, ampliar cada recompensa existente con:

- Título.
- Descripción.
- Monto mínimo.
- Fecha estimada de entrega.
- Cupos totales disponibles.

Frames

1. `S3_HU213_Reward_Default`
   - Mostrar una tarjeta por recompensa.
   - Botón "+ Añadir recompensa".
   - Fecha con input `date`.
   - Cupos con input numérico entero.
   - Permitir cupos ilimitados solo si el backend lo admite; mostrar un
     checkbox/switch claro.

2. `S3_HU213_Reward_Validation`
   - Mostrar errores inline:
     - "El título es obligatorio".
     - "La descripción es obligatoria".
     - "El monto debe ser mayor a 0".
     - "Ingresa una fecha válida".
     - "Los cupos deben ser un entero positivo".

3. `S3_HU213_Reward_Loading`
   - Deshabilitar guardar/publicar y eliminación.
   - Mostrar estados de guardado.

4. `S3_HU213_Reward_Saved`
   - Toast: "Recompensa guardada correctamente".
   - Mantener fecha y cupos visibles.

5. `S3_HU213_Reward_SoldOut`
   - En `CampaignPage`, el nivel debe mostrar etiqueta "Agotado".
   - Tarjeta deshabilitada visualmente.
   - Impedir clic para seleccionarla.
   - Mantener visible título, descripción, monto y cupos restantes.

6. `S3_HU213_Reward_LimitedRemaining`
   - Mostrar "Quedan X cupos".
   - Deshabilitar o impedir selección si llega a cero.

7. `S3_HU213_Reward_Unlimited`
   - Mostrar "Cupos ilimitados" si `quantity === null`.

Datos frontend

Extender `Reward`:

```ts
export interface Reward {
  id: string
  title: string
  description: string
  minimumAmount: number
  estimatedDeliveryDate: string | null
  quantity: number | null
  claimedQuantity: number
  available: boolean
  remainingQuantity: number | null
}
```

Extender los payloads de borrador:

```ts
{
  title: string
  description: string
  minimumAmount: number
  estimatedDeliveryDate: string
  quantity: number | null
}
```

Validación frontend

- Título: 1-120 caracteres.
- Descripción: obligatoria y dentro del límite acordado.
- Monto: número positivo con máximo dos decimales.
- Fecha: obligatoria si el backend la exige y en formato ISO.
- Cupos: entero positivo o `null` para ilimitado.
- No enviar `claimedQuantity`, `available`, `remainingQuantity`, `id` ajeno,
  `campaignId` ni `draftId` como autoridad.
- Impedir guardar si existe un campo inválido.
- Mantener los campos tras un error de API.

Integración y estados

- Reutilizar `POST /api/drafts` y `PUT /api/drafts/{draftId}`.
- Al publicar usar `POST /api/drafts/{draftId}/publish`.
- Consumir las recompensas desde `GET /api/campaigns/{campaignId}`.
- Si un nivel es agotado:
  - `quantity !== null && claimedQuantity >= quantity`.
  - Mostrar `Agotado`.
  - No enviarlo como recompensa seleccionada.
- Si backend devuelve `REWARD_SOLD_OUT` o `409`, mostrarlo en el flujo de
  pago y recargar los niveles.

Experiencia en campaña

- Crear una sección "Recompensas" con tarjetas consistentes.
- Cada tarjeta debe mostrar:
  - título;
  - descripción;
  - monto mínimo;
  - fecha estimada;
  - cupos o disponibilidad;
  - botón "Seleccionar".
- Al seleccionar una recompensa disponible, pasarlo a `PaymentFlow`.
- No permitir seleccionar una recompensa agotada mediante teclado, pointer o
  estado interno.
- En mobile, usar tarjetas apiladas.

Accesibilidad

- Inputs con labels asociados.
- Describir unidades de monto y cupos.
- Usar `aria-disabled=true` y botón deshabilitado.
- Los mensajes de error deben estar conectados al campo mediante
  `aria-describedby` y `aria-invalid`.
- Mantener una descripción visible de "Agotado".

Entregables

- Formulario de recompensas ampliado.
- Lista de recompensas en campaña.
- Estados disponibles, limitados, ilimitados y agotados.
- Validaciones inline.
- Sincronización con `PaymentFlow`.
- Fixtures desktop y mobile.
- Estados loading, success, validation, sold-out y API error.
```

---

## Prompt 3 — HU 3.1.2: Suscripción o aportes recurrentes

```text
Actúa como desarrollador frontend senior en Figma Make. Implementa la interfaz
de suscripciones mensuales en el frontend existente.

Antes de editar inspecciona `App.tsx`, `SponsorDashboard.tsx`,
`PaymentFlow.tsx`, `TransactionHistory.tsx`, `types.ts`, `services/api.ts`,
`Navbar.tsx` y los estilos globales.

Historia

Como patrocinador, quiero programar un aporte recurrente mensual a un creador
continuo.

Navegación

- Crear una ruta `/subscriptions`.
- Agregar entrada "Mis suscripciones" solo para patrocinadores.
- Puede enlazarse desde `SponsorDashboard`, el menú de usuario o una tarjeta
  "Apoyo mensual".
- Mantener acceso protegido: un usuario no autenticado se redirige a login.

Pantallas

1. `S3_HU312_Subscriptions_Default`
   - Título "Mis suscripciones".
   - Lista paginada de suscripciones activas y canceladas.
   - Cada tarjeta muestra creador, monto, moneda, estado y próximo cobro.
   - Estados vacío y loading.

2. `S3_HU312_Subscribe_Default`
   - Desde un perfil o panel de creador, permitir crear un plan mensual.
   - Campos:
     - creador objetivo;
     - monto;
     - moneda;
     - método de pago simulado.
   - Mostrar un resumen antes de confirmar.

3. `S3_HU312_Subscribe_Loading`
   - Deshabilitar Confirmar.
   - Mostrar "Procesando primer cobro...".

4. `S3_HU312_Subscribe_Success`
   - Mostrar "Suscripción activada".
   - Mostrar monto, moneda y próximo cobro.
   - CTA "Ver mis suscripciones".

5. `S3_HU312_Subscribe_PaymentError`
   - Mostrar mensajes separados:
     - método inválido;
     - fondos insuficientes;
     - validación de monto.
   - Mantener el método visible para corregir.
   - No activar suscripción.

6. `S3_HU312_CancelConfirm`
   - Modal/confirmación con "¿Cancelar suscripción?".
   - Explicar que no habrá cobros futuros.
   - Confirmar y conservar opción de cerrar.

7. `S3_HU312_Cancelled`
   - Estado gris "Cancelada".
   - Ocultar acción de cancelar.
   - Mostrar fecha de cancelación.

Tipos frontend

```ts
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'FAILED'

interface CreatorSubscription {
  id: string
  creatorId: string
  creatorName?: string
  amount: number
  currency: string
  status: SubscriptionStatus
  nextChargeAt: string | null
  lastChargeAt: string | null
  cancelledAt: string | null
  createdAt: string
}

interface PageResponse<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}
```

Integración API

- `POST /api/subscriptions`
- `GET /api/subscriptions/me?page=0&pageSize=20`
- `POST /api/subscriptions/{subscriptionId}/cancel`

Body de creación:

```json
{
  "creatorId": "UUID",
  "amount": 25,
  "currency": "USD",
  "paymentMethodId": "sim_success"
}
```

Validación

- Monto mayor a cero y máximo dos decimales.
- Moneda de tres letras válida.
- Creador existente y distinto del usuario actual.
- Método de pago obligatorio.
- Mostrar los errores inline devueltos por backend.
- No enviar tarjeta completa ni CVV.
- Ante `402/409` mostrar el código del backend sin detalles sensibles.
- Ante `401`, restaurar sesión/login.

Historial

- Añadir una pestaña o fila "Suscripción" en `TransactionHistory`.
- Las renovaciones exitosas deben mostrar estado confirmado y aporte recurrente.
- Si el backend expone `subscriptionId`, mostrarlo como referencia secundaria.
- Una renovación fallida debe aparecer como intento fallido solo si el backend
  entrega esa información.

Accesibilidad

- Modal cancelación con foco atrapado y Escape para cerrar.
- Labels asociados a monto, moneda y método.
- Mensajes de estado con `role="alert"` o `aria-live`.
- Acciones deshabilitadas con texto explícito.

Entregables

- Lista de suscripciones.
- Flujo de creación y primer cobro.
- Confirmación y cancelación.
- Loading, empty, success y payment-error.
- Integración o fixtures con las respuestas documentadas.
- Prueba responsive desktop/mobile.
- No implementar campañas ficticias ni cobros reales.
```

---

## Prompt 4 — HU 3.2.2: Gestión de reembolsos de campañas fallidas

```text
Actúa como desarrollador frontend senior en Figma Make. Implementa en el
frontend existente la experiencia visual de reembolsos de campañas fijas
fallidas.

Antes de editar inspecciona `TransactionHistory.tsx`, `CampaignPage.tsx`,
`SupportedProjects.tsx`, `types.ts`, `services/api.ts` y `Navbar.tsx`.

Historia

Como patrocinador, quiero claridad sobre aportes retenidos y reembolsados
cuando una campaña fija no alcanza su meta.

Tipos frontend

Extender/validar:

```ts
export type ContributionStatus =
  'PENDING' | 'HELD' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'

export type ReceiptStatus =
  'HELD' | 'SUCCESSFUL' | 'REFUNDED' | 'FAILED'

interface TransactionHistoryItem {
  contributionId: string
  date: string
  projectName: string
  campaignId: string
  amount: number
  currency: string
  referenceCode: string | null
  receiptStatus: ReceiptStatus | null
  receiptStatusLabel: string | null
  contributionStatus: ContributionStatus
  paymentStatus: PaymentStatus | null
  refundedAt?: string | null
}
```

Frames

1. `S3_HU322_History_Held`
   - Badge amarillo "Retenido".
   - Texto informativo:
     "Tus fondos están retenidos de forma segura hasta que finalice la campaña."
   - No mostrar "Reembolsado" ni "Exitoso".

2. `S3_HU322_History_Refunded`
   - Badge gris/rojo suave "Reembolsado".
   - Comprobante con el mismo código de referencia.
   - Mostrar "Comprobante reembolsado".
   - Si existe `refundedAt`, mostrar fecha.

3. `S3_HU322_History_Successful`
   - Badge verde "Consolidado" o "Exitoso".
   - Mostrar que el aporte fue aprobado después del cierre.

4. `S3_HU322_TransactionDetail_Held`
   - Panel lateral o modal con resumen del aporte.
   - Explicación de retención y fecha límite de campaña.
   - Estados de aporte, pago y comprobante.

5. `S3_HU322_TransactionDetail_Refunded`
   - Mostrar monto devuelto.
   - Etiqueta final "Reembolsado".
   - Conservar botón copiar referencia.

6. `S3_HU322_CampaignFailed`
   - En campaña fija fallida, mostrar banner:
     "Esta campaña no alcanzó su meta. Los aportes fueron reembolsados."
   - No mostrar el botón de aportar.

Integración

- Mantener `GET /api/contributions/me?page=0&pageSize=10`.
- Usar `contributionStatus`, `receiptStatus`, `paymentStatus` y
  `receiptStatusLabel`.
- Si el backend expone detalle adicional, utilizarlo sin inventar estados.
- Actualizar el historial después de un cierre o al volver a la pantalla.

Validación visual

- `HELD`: amarillo.
- `REFUNDED`: gris/rojo suave.
- `SUCCESSFUL/CONFIRMED`: verde.
- `FAILED/PENDING`: rojo o amarillo según el estado.
- Mostrar etiquetas claras en desktop y mobile.
- Mantener paginación y estados vacíos existentes.

Accesibilidad

- Usar texto además de color.
- Tooltips no deben ser el único canal de explicación.
- Mensajes informativos con iconos ocultos a lectores de pantalla.
- Código de referencia seleccionable y copiable.
- Confirmar visualmente el resultado de copia.

Entregables

- Estados retenido, reembolsado y consolidado.
- Actualización de `TransactionHistory`.
- Detalle de aportes si existe un patrón reutilizable.
- Banners de campaña fallida.
- Estados loading, empty y error.
- Fixtures desktop/mobile.
```

---

## Prompt 5 — HU 4.1.1: Comentarios y preguntas frecuentes

```text
Actúa como desarrollador frontend senior en Figma Make. Implementa el muro de
discusión y FAQ de campañas en el frontend existente.

Antes de editar inspecciona `CampaignPage.tsx`, `App.tsx`, `types.ts`,
`services/api.ts`, `Navbar.tsx` y los patrones de carga existentes.

Historia

Como patrocinador, quiero publicar preguntas antes de aportar y ver respuestas
oficiales del creador.

Navegación dentro de CampaignPage

Crear pestañas:

- Información
- Actualizaciones
- Discusión
- Preguntas frecuentes

Mantener navegación por teclado y URL interna si el proyecto ya usa tabs.

Frames

1. `S3_HU411_Discussion_Default`
   - Lista de preguntas con nombre del autor y fecha.
   - Respuestas anidadas debajo.
   - Avatar con inicial o silueta.
   - Formulario para publicar pregunta.

2. `S3_HU411_Discussion_Validation`
   - Campo vacío: "La pregunta no puede estar vacía".
   - Sobre límite: "La pregunta no puede superar 1000 caracteres".
   - Contador `0/1000`.

3. `S3_HU411_Discussion_Loading`
   - Skeleton de comentarios.
   - Deshabilitar Enviar mientras se publica.

4. `S3_HU411_Discussion_Success`
   - Mostrar la pregunta nueva inmediatamente después de la respuesta válida.
   - Toast "Pregunta publicada".

5. `S3_HU411_CreatorReply`
   - Solo visible al creador propietario.
   - Campo "Responder como creador".
   - Botón "Responder".

6. `S3_HU411_OfficialAnswer`
   - Respuesta del creador con badge "Respuesta oficial".
   - Botón "Convertir a FAQ" solo para el creador propietario.
   - Después de convertir, actualizar badge y desaparecer de FAQ solo si se
     requiere.

7. `S3_HU411_FAQ`
   - Lista de preguntas y respuestas marcadas oficiales.
   - Ordenado por fecha o por el criterio del backend.
   - Estado vacío "Aún no hay preguntas frecuentes".

Tipos frontend

```ts
export interface CampaignComment {
  id: string
  campaignId: string
  authorId: string
  authorName: string
  parentCommentId: string | null
  body: string
  isOfficialAnswer: boolean
  isFaq: boolean
  createdAt: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}
```

Integración API

- `GET /api/campaigns/{campaignId}/discussion?page=0&pageSize=20`
- `POST /api/campaigns/{campaignId}/discussion/comments`
- `POST /api/campaigns/{campaignId}/discussion/comments/{commentId}/replies`
- `PATCH /api/campaigns/{campaignId}/discussion/comments/{commentId}/faq`
- `GET /api/campaigns/{campaignId}/faq?page=0&pageSize=20`

Publicar pregunta:

```json
{
  "body": "¿Cuál será la fecha de entrega?"
}
```

Respuestas y validaciones

- Texto obligatorio.
- Máximo configurado por backend, usar 1000 como valor visible.
- Contador visible.
- Escapar el texto y mostrarlo como texto plano.
- No aceptar HTML como contenido enriquecido.
- Ante `400`, mapear errores por campo.
- Ante `401`, solicitar login sin perder el texto.
- Ante `403`, ocultar acciones de creador y mostrar "Sin permisos".
- Ante `404`, mostrar campaña/comentario no encontrado.
- Ante `409`, recargar el hilo y explicar el conflicto.

Comportamiento UX

- Mantener el texto escrito si falla la publicación.
- Deshabilitar Enviar mientras se procesa.
- Después de publicar recargar la discusión o insertar la respuesta aprobada.
- No actualizar un estado exitoso si el backend devuelve error.
- Impedir respuestas duplicadas mientras se procesa.
- Mostrar botón "Convertir a FAQ" solo al creador propietario.
- Una vez convertido, mostrar badge permanente "Respuesta oficial".

Accesibilidad

- Textarea con label.
- Contador con `aria-live` si cambia.
- Mensaje de error asociado mediante `aria-describedby`.
- Botones de respuesta visibles y de tamaño táctil.
- Tabs navegables por flechas si se implementan como tablist.
- IDs de comentarios no se exponen visualmente salvo necesidad.

Entregables

- Pestaña Discusión.
- Pestaña Preguntas frecuentes.
- Publicación de preguntas.
- Respuesta del creador.
- Conversión a FAQ.
- Estados loading, error, success, empty y forbidden.
- Fixtures desktop/mobile.
```

---

## Prompt 6 — HU 4.1.2: Notificación de nuevos aportes al creador

```text
Actúa como desarrollador frontend senior en Figma Make. Implementa la interfaz
de notificaciones de nuevos aportes en el frontend existente.

Antes de editar inspecciona `Navbar.tsx`, `CreatorDashboard.tsx`,
`PaymentFlow.tsx`, `types.ts`, `services/api.ts` y `App.tsx`.

Historia

Como creador, necesito ver notificaciones internas cuando reciba un aporte.

Reutilizar

- El centro de notificaciones existente en `Navbar`.
- `GET /api/notifications/me`.
- `PATCH /api/notifications/{notificationId}/read`.
- El contador visual existente basado en notificaciones no leídas.

Tipos frontend

```ts
export interface Notification {
  id: string
  type: string
  title: string
  body: string
  campaignId: string | null
  contributionId?: string | null
  campaignUpdateId: string | null
  createdAt: string
  read: boolean
}

export interface NotificationDto {
  id: string
  type: string
  title: string
  body: string
  campaignId: string | null
  contributionId?: string | null
  campaignUpdateId: string | null
  readAt: string | null
  createdAt: string
}
```

Frames

1. `S3_HU412_CreatorNavbar_Default`
   - Campana visible en Navbar.
   - Contador rojo/primary con no leídas.
   - Mostrar `9+` si el backend devuelve más de nueve.

2. `S3_HU412_NotifPanel_Loading`
   - Skeleton o estado "Cargando notificaciones".

3. `S3_HU412_NotifPanel_NewContribution`
   - Badge o acento verde/primary.
   - Texto exacto recibido del backend si corresponde:
     "¡Nuevo aporte! Ana Pérez ha aportado $25.00 USD".
   - Título "Nuevo aporte recibido".
   - Fecha relativa o absoluta.

4. `S3_HU412_NotifPanel_Unread`
   - Fondo primario claro.
   - Punto azul/verde.
   - Texto "Sin leer".

5. `S3_HU412_NotifPanel_Read`
   - Fondo blanco.
   - Sin punto.
   - Estado "Leída".

6. `S3_HU412_NotifPanel_Empty`
   - "No tienes notificaciones".

7. `S3_HU412_NotifPanel_Error`
   - Mensaje de error y botón "Reintentar".

Comportamiento

- Consultar notificaciones al iniciar sesión y al abrir el panel.
- Implementar consulta periódica configurable solo si el backend lo permite,
  por ejemplo cada 30 segundos.
- Detener el polling al cerrar sesión.
- Reconciliar el contador con `readAt` recibido.
- No incrementar el contador manualmente salvo ante una notificación nueva
  confirmada por API.
- Al abrir una notificación:
  - llamar `PATCH /api/notifications/{id}/read`;
  - actualizar su estado local;
  - recalcular el contador;
  - navegar a la campaña si existe `campaignId`.
- Una notificación sin campaña puede permanecer abierta en el panel.
- Repetir el mismo llamado no debe cambiar el resultado.

Integración API

- `GET /api/notifications/me?page=0&pageSize=20&unreadOnly=false`.
- `PATCH /api/notifications/{notificationId}/read`.

Agregar un mapa visual por `type`:

- `NEW_CONTRIBUTION`: ícono de aporte y etiqueta "Nuevo aporte".
- `CAMPAIGN_UPDATE_PUBLISHED`: etiqueta "Actualización".
- Tipos futuros: etiqueta "Notificación".

No construir el texto visual desde datos no validados. El `body` viene del
backend y debe mostrarse escapado como texto.

Validaciones

- Solo mostrar notificaciones del usuario autenticado.
- No aceptar `recipientUserId` de URL o body.
- Ante `401`, cerrar sesión o redirigir a login.
- Ante `403/404`, mostrar error seguro.
- Ante error de polling, no ocultar el contenido existente ni lanzar a cero.
- Mantener el contador actual si falla temporalmente.

Accesibilidad

- Botón de campana con `aria-label` y cantidad de no leídas.
- Panel con `role="dialog"` o región semántica.
- Escape cierra el panel.
- Focus visible en las filas.
- Animación mínima y respetar `prefers-reduced-motion`.
- Mensaje de contador leído por lector de pantalla.

Entregables

- Campana y contador en Navbar.
- Panel de notificaciones actualizado.
- Estados leído/no leído.
- Consulta inicial y polling configurable.
- Loading, empty, error y retry.
- Navegación a campaña.
- Test visual con notificación de aporte realista.
- No implementar backend ni cambios de ruta ajenos al frontend.
```
