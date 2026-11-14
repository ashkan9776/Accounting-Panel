import Decimal from 'decimal.js';

export enum TableStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  BILL_PRINTED = 'BILL_PRINTED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING'
}

export enum OrderChannel {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY',
  ONLINE_AGGREGATOR = 'ONLINE_AGGREGATOR'
}

export enum RestaurantOrderStatus {
  OPEN = 'OPEN',
  KITCHEN_IN_PROGRESS = 'KITCHEN_IN_PROGRESS',
  READY_TO_SERVE = 'READY_TO_SERVE',
  SERVED = 'SERVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export enum KitchenStation {
  HOT_KITCHEN = 'HOT_KITCHEN',
  COLD_KITCHEN = 'COLD_KITCHEN',
  BAR_CAFE = 'BAR_CAFE',
  BAKERY_DESSERT = 'BAKERY_DESSERT'
}

export enum KdsTicketStatus {
  QUEUED = 'QUEUED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED'
}

export enum DeliveryStatus {
  PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED'
}

export enum SplitBillMethod {
  EQUAL_PARTS = 'EQUAL_PARTS',
  BY_ITEM = 'BY_ITEM',
  CUSTOM_AMOUNT = 'CUSTOM_AMOUNT'
}

export enum MenuEngineeringCategory {
  STAR = 'STAR',           // سود بالا، فروش بالا
  PLOWHORSE = 'PLOWHORSE', // سود پایین، فروش بالا
  PUZZLE = 'PUZZLE',       // سود بالا، فروش پایین
  DOG = 'DOG'              // سود پایین، فروش پایین
}

export interface RecipeIngredient {
  rawProductId: string;
  quantity: string | number;
  wastePercentage?: string | number; // درصد ضایعات فرآیند آماده‌سازی
}

export interface RecipeDefinition {
  menuProductId: string;
  yieldQuantity: string | number; // تعداد خروجی فرمول (مثلاً ۱ پرس)
  ingredients: RecipeIngredient[];
}

export interface FoodCostAnalysisResult {
  recipeCostAmount: string;
  sellPriceAmount: string;
  foodCostPercentage: string;
  grossMarginAmount: string;
  grossMarginPercentage: string;
  category: MenuEngineeringCategory;
}
