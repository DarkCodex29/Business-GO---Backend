# 💰 Estrategia de Precios - Mercado Peruano

## 🎯 **Análisis del Mercado Peruano**

### **Contexto Económico:**

- **Salario mínimo:** S/ 1,025 (2024)
- **Micro empresas:** 95% del tejido empresarial
- **Digitalización:** En crecimiento post-pandemia
- **WhatsApp Business:** Muy popular en PYMEs

### **Competencia Directa:**

- **Chatbots básicos:** S/ 50-150/mes
- **CRM simples:** S/ 80-200/mes
- **Soluciones completas:** S/ 300-800/mes

## 💡 **Nuestra Propuesta de Valor**

### **Diferenciadores:**

- ✅ **WhatsApp nativo** (no chatbot genérico)
- ✅ **Automatización N8N** (sin programación)
- ✅ **Sistema completo** (CRM + Ventas + Facturación)
- ✅ **Multi-tenant** (cada empresa independiente)

## 📊 **Planes de Suscripción Optimizados**

### **🆓 TRIAL (14 días gratis)**

```typescript
TRIAL: {
  precio: 0,
  duracion: 14, // días
  limite_clientes: 50,
  limite_productos: 25,
  limite_usuarios: 2,
  limite_mensajes: 500,
  soporte: "Email"
}
```

### **🥉 BÁSICO - S/ 99/mes**

```typescript
BASICO: {
  precio: 99, // ~$27 USD
  limite_clientes: 200,
  limite_productos: 100,
  limite_usuarios: 5,
  limite_mensajes: 2000,
  features: [
    "WhatsApp automatizado",
    "Cotizaciones automáticas",
    "Dashboard básico",
    "Reportes simples"
  ],
  soporte: "Email + Chat"
}
```

### **🥈 PRO - S/ 249/mes**

```typescript
PRO: {
  precio: 249, // ~$68 USD
  limite_clientes: 1000,
  limite_productos: 500,
  limite_usuarios: 15,
  limite_mensajes: 10000,
  features: [
    "Todo BÁSICO +",
    "IA para clasificación",
    "Reportes avanzados",
    "API acceso",
    "Integraciones",
    "Facturación automática"
  ],
  soporte: "Email + Chat + WhatsApp"
}
```

### **🥇 ENTERPRISE - S/ 449/mes**

```typescript
ENTERPRISE: {
  precio: 449, // ~$122 USD
  limite_clientes: -1, // ilimitado
  limite_productos: -1,
  limite_usuarios: -1,
  limite_mensajes: -1,
  features: [
    "Todo PRO +",
    "Soporte 24/7",
    "Customización",
    "Onboarding personalizado",
    "Backup prioritario",
    "SLA garantizado"
  ],
  soporte: "Dedicado + Teléfono"
}
```

## 🎯 **Estrategia de Penetración**

### **Fase 1: Lanzamiento (Mes 1-3)**

- **Descuento Early Bird:** 50% OFF primeros 3 meses
- **BÁSICO:** S/ 49/mes (en lugar de S/ 99)
- **PRO:** S/ 124/mes (en lugar de S/ 249)

### **Fase 2: Crecimiento (Mes 4-6)**

- **Descuento:** 25% OFF
- **BÁSICO:** S/ 74/mes
- **PRO:** S/ 187/mes

### **Fase 3: Estabilización (Mes 7+)**

- **Precios normales**
- **Descuentos por volumen**
- **Planes anuales:** 2 meses gratis

## 💳 **Métodos de Pago Locales**

### **Opciones Principales:**

- ✅ **Yape/Plin** (transferencias móviles)
- ✅ **Tarjetas de crédito/débito**
- ✅ **Transferencia bancaria**
- ✅ **PagoEfectivo** (pagos en efectivo)

### **Integraciones Necesarias:**

- **Culqi** (pasarela peruana)
- **Mercado Pago** (popular en Perú)
- **PayU** (alternativa regional)

## 📈 **Proyección de Ingresos**

### **Escenario Conservador:**

```typescript
const PROYECCION_CONSERVADORA = {
  mes_3: {
    empresas: 30,
    distribucion: {
      basico: 20, // S/ 49 c/u = S/ 980
      pro: 8, // S/ 124 c/u = S/ 992
      enterprise: 2, // S/ 224 c/u = S/ 448
    },
    total_mensual: 'S/ 2,420',
    total_anual: 'S/ 29,040',
  },

  mes_6: {
    empresas: 80,
    distribucion: {
      basico: 50, // S/ 74 c/u = S/ 3,700
      pro: 25, // S/ 187 c/u = S/ 4,675
      enterprise: 5, // S/ 337 c/u = S/ 1,685
    },
    total_mensual: 'S/ 10,060',
    total_anual: 'S/ 120,720',
  },

  año_1: {
    empresas: 200,
    distribucion: {
      basico: 120, // S/ 99 c/u = S/ 11,880
      pro: 60, // S/ 249 c/u = S/ 14,940
      enterprise: 20, // S/ 449 c/u = S/ 8,980
    },
    total_mensual: 'S/ 35,800',
    total_anual: 'S/ 429,600',
  },
};
```

### **Escenario Optimista:**

```typescript
const PROYECCION_OPTIMISTA = {
  año_1: {
    empresas: 500,
    total_mensual: 'S/ 89,500',
    total_anual: 'S/ 1,074,000',
  },

  año_2: {
    empresas: 1200,
    total_mensual: 'S/ 214,800',
    total_anual: 'S/ 2,577,600',
  },
};
```

## 🎯 **Segmentación de Clientes**

### **Micro Empresas (1-5 empleados)**

- **Plan objetivo:** BÁSICO
- **Sectores:** Retail, servicios, gastronomía
- **Precio máximo:** S/ 150/mes

### **Pequeñas Empresas (6-20 empleados)**

- **Plan objetivo:** PRO
- **Sectores:** Manufactura, distribución, profesionales
- **Precio máximo:** S/ 300/mes

### **Medianas Empresas (21+ empleados)**

- **Plan objetivo:** ENTERPRISE
- **Sectores:** Corporativos, franquicias, cadenas
- **Precio máximo:** S/ 500/mes

## 🚀 **Estrategias de Conversión**

### **Trial a Pago:**

- **Onboarding guiado** en primeros 3 días
- **Llamada de seguimiento** día 7
- **Descuento especial** día 12
- **Meta:** 30% conversión trial → pago

### **Upselling:**

- **Alertas de límites** al 80% de uso
- **Features PRO** como "prueba gratis"
- **Descuentos por upgrade** inmediato
- **Meta:** 20% upgrade mensual

### **Retención:**

- **Soporte proactivo** primeros 30 días
- **Webinars mensuales** de capacitación
- **Comunidad de usuarios** en WhatsApp
- **Meta:** 90% retención mensual

## 💡 **Propuesta de Valor por Segmento**

### **Para Bodegas/Minimarkets:**

> "Automatiza pedidos por WhatsApp. Tus clientes piden, tú vendes automáticamente. S/ 99/mes."

### **Para Restaurantes:**

> "Carta digital + pedidos automáticos por WhatsApp. Aumenta ventas 40%. S/ 249/mes."

### **Para Distribuidoras:**

> "Gestiona 1000+ clientes automáticamente. Cotizaciones instantáneas. S/ 449/mes."

## 🎯 **Métricas Clave**

### **Adquisición:**

- **CAC (Costo Adquisición Cliente):** < S/ 150
- **LTV (Valor Vida Cliente):** > S/ 1,500
- **Ratio LTV/CAC:** > 10x

### **Retención:**

- **Churn mensual:** < 5%
- **NPS (Net Promoter Score):** > 50
- **Tiempo hasta valor:** < 7 días

### **Crecimiento:**

- **Crecimiento mensual:** 20%+
- **Viral coefficient:** 0.3+
- **Upgrade rate:** 15%+
