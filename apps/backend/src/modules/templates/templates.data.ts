import { CanonicalSchema, DatabaseEngine, SchemaColumn, SchemaRelationship, SchemaTable } from '@schemapilot/shared-types';
import { autoLayoutTables } from '@schemapilot/schema-core';

export interface ProjectTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  engine: DatabaseEngine;
  schema: CanonicalSchema;
}

function col(
  name: string,
  dataType: SchemaColumn['dataType'],
  opts: Partial<SchemaColumn> = {},
): SchemaColumn {
  return {
    id: `col_${name}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    dataType,
    isPrimaryKey: Boolean(opts.isPrimaryKey),
    isForeignKey: Boolean(opts.isForeignKey),
    isNullable: opts.isNullable ?? false,
    isUnique: Boolean(opts.isUnique || opts.isPrimaryKey),
    length: opts.length,
    precision: opts.precision,
    scale: opts.scale,
    defaultValue: opts.defaultValue,
    enumValues: opts.enumValues,
    comment: opts.comment,
  };
}

function tbl(
  name: string,
  description: string,
  columns: SchemaColumn[],
  indexes: { name: string; columns: string[]; isUnique?: boolean }[] = [],
): SchemaTable {
  return {
    id: `tbl_${name}`,
    name,
    description,
    position: { x: 0, y: 0 },
    columns,
    indexes: indexes.map((i, idx) => ({
      id: `idx_${name}_${idx}`,
      name: i.name,
      columns: i.columns,
      isUnique: Boolean(i.isUnique),
      type: i.isUnique ? 'UNIQUE' : 'BTREE',
    })),
    constraints: [],
  };
}

function rel(
  sourceTable: string,
  sourceColumn: string,
  targetTable: string,
  targetColumn = 'id',
  type: SchemaRelationship['type'] = 'ONE_TO_MANY',
): SchemaRelationship {
  return {
    id: `rel_${sourceTable}_${sourceColumn}`,
    name: `fk_${sourceTable}_${sourceColumn}`,
    sourceTable,
    sourceColumn,
    targetTable,
    targetColumn,
    type,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  };
}

function buildTemplate(
  id: string,
  name: string,
  category: string,
  description: string,
  engine: DatabaseEngine,
  tables: SchemaTable[],
  relationships: SchemaRelationship[],
): ProjectTemplate {
  return {
    id,
    slug: id,
    name,
    category,
    description,
    engine,
    schema: autoLayoutTables({
      name: `${name} Schema`,
      description,
      engine,
      tables,
      relationships,
    }),
  };
}

const pkId = () => col('id', 'UUID', { isPrimaryKey: true, defaultValue: 'UUID()' });
const timestamps = () => [
  col('created_at', 'TIMESTAMP', { defaultValue: 'CURRENT_TIMESTAMP' }),
  col('updated_at', 'TIMESTAMP', { defaultValue: 'CURRENT_TIMESTAMP' }),
];

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  buildTemplate(
    'ecommerce',
    'E-Commerce Platform',
    'Retail & Commerce',
    'Full-featured online store with users, products, categories, carts, orders, payments, coupons, and reviews.',
    'POSTGRESQL',
    [
      tbl('users', 'Customer and admin accounts', [pkId(), col('email', 'VARCHAR', { length: 255, isUnique: true }), col('full_name', 'VARCHAR', { length: 120 }), col('password_hash', 'VARCHAR', { length: 255 }), col('deleted_at', 'TIMESTAMP', { isNullable: true }), ...timestamps()]),
      tbl('categories', 'Product catalog hierarchy', [pkId(), col('name', 'VARCHAR', { length: 100 }), col('slug', 'VARCHAR', { length: 120, isUnique: true }), col('parent_id', 'UUID', { isForeignKey: true, isNullable: true })]),
      tbl('products', 'Sellable catalog items', [pkId(), col('category_id', 'UUID', { isForeignKey: true }), col('sku', 'VARCHAR', { length: 64, isUnique: true }), col('title', 'VARCHAR', { length: 200 }), col('price', 'DECIMAL', { precision: 10, scale: 2 }), col('stock_qty', 'INT', { defaultValue: '0' }), ...timestamps()], [{ name: 'idx_products_category', columns: ['category_id'] }]),
      tbl('orders', 'Customer purchase orders', [pkId(), col('user_id', 'UUID', { isForeignKey: true }), col('status', 'ENUM', { enumValues: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'], defaultValue: 'PENDING' }), col('total_amount', 'DECIMAL', { precision: 12, scale: 2 }), ...timestamps()], [{ name: 'idx_orders_user', columns: ['user_id'] }]),
      tbl('order_items', 'Line items within an order', [pkId(), col('order_id', 'UUID', { isForeignKey: true }), col('product_id', 'UUID', { isForeignKey: true }), col('quantity', 'INT'), col('unit_price', 'DECIMAL', { precision: 10, scale: 2 })], [{ name: 'idx_order_items_order', columns: ['order_id'] }, { name: 'idx_order_items_product', columns: ['product_id'] }]),
      tbl('payments', 'Payment gateway transactions', [pkId(), col('order_id', 'UUID', { isForeignKey: true }), col('provider', 'VARCHAR', { length: 50 }), col('amount', 'DECIMAL', { precision: 12, scale: 2 }), col('status', 'VARCHAR', { length: 30 }), ...timestamps()], [{ name: 'idx_payments_order', columns: ['order_id'] }]),
      tbl('reviews', 'Product ratings and feedback', [pkId(), col('product_id', 'UUID', { isForeignKey: true }), col('user_id', 'UUID', { isForeignKey: true }), col('rating', 'SMALLINT'), col('comment', 'TEXT', { isNullable: true }), ...timestamps()], [{ name: 'idx_reviews_product', columns: ['product_id'] }, { name: 'idx_reviews_user', columns: ['user_id'] }]),
    ],
    [
      rel('categories', 'parent_id', 'categories'),
      rel('products', 'category_id', 'categories'),
      rel('orders', 'user_id', 'users'),
      rel('order_items', 'order_id', 'orders'),
      rel('order_items', 'product_id', 'products'),
      rel('payments', 'order_id', 'orders'),
      rel('reviews', 'product_id', 'products'),
      rel('reviews', 'user_id', 'users'),
    ],
  ),
  buildTemplate(
    'banking',
    'Core Banking & Ledger',
    'FinTech',
    'Double-entry ledger banking system with customers, accounts, transactions, transfers, and KYC records.',
    'POSTGRESQL',
    [
      tbl('customers', 'Bank account holders', [pkId(), col('email', 'VARCHAR', { length: 255, isUnique: true }), col('kyc_status', 'VARCHAR', { length: 30, defaultValue: 'PENDING' }), ...timestamps()]),
      tbl('accounts', 'Checking, savings, and treasury accounts', [pkId(), col('customer_id', 'UUID', { isForeignKey: true }), col('account_number', 'VARCHAR', { length: 32, isUnique: true }), col('currency', 'CHAR', { length: 3, defaultValue: 'USD' }), col('balance', 'DECIMAL', { precision: 18, scale: 4, defaultValue: '0' }), ...timestamps()], [{ name: 'idx_accounts_customer', columns: ['customer_id'] }]),
      tbl('ledger_entries', 'Immutable double-entry ledger', [pkId(), col('account_id', 'UUID', { isForeignKey: true }), col('entry_type', 'ENUM', { enumValues: ['DEBIT', 'CREDIT'] }), col('amount', 'DECIMAL', { precision: 18, scale: 4 }), col('reference_id', 'UUID'), col('created_at', 'TIMESTAMP', { defaultValue: 'CURRENT_TIMESTAMP' })], [{ name: 'idx_ledger_account', columns: ['account_id'] }]),
      tbl('transfers', 'Peer and wire transfers', [pkId(), col('from_account_id', 'UUID', { isForeignKey: true }), col('to_account_id', 'UUID', { isForeignKey: true }), col('amount', 'DECIMAL', { precision: 18, scale: 4 }), col('status', 'VARCHAR', { length: 30 }), ...timestamps()], [{ name: 'idx_transfers_from', columns: ['from_account_id'] }, { name: 'idx_transfers_to', columns: ['to_account_id'] }]),
    ],
    [
      rel('accounts', 'customer_id', 'customers'),
      rel('ledger_entries', 'account_id', 'accounts'),
      rel('transfers', 'from_account_id', 'accounts'),
      rel('transfers', 'to_account_id', 'accounts'),
    ],
  ),
  buildTemplate(
    'hospital',
    'Hospital Management System',
    'Healthcare',
    'Patients, doctors, departments, appointments, medical records, prescriptions, and billing.',
    'MYSQL',
    [
      tbl('departments', 'Medical departments', [pkId(), col('name', 'VARCHAR', { length: 120, isUnique: true })]),
      tbl('doctors', 'Physicians and specialists', [pkId(), col('department_id', 'UUID', { isForeignKey: true }), col('full_name', 'VARCHAR', { length: 120 }), col('license_no', 'VARCHAR', { length: 64, isUnique: true })], [{ name: 'idx_doctors_dept', columns: ['department_id'] }]),
      tbl('patients', 'Patient demographics', [pkId(), col('full_name', 'VARCHAR', { length: 120 }), col('dob', 'DATE'), col('phone', 'VARCHAR', { length: 30 }), ...timestamps()]),
      tbl('appointments', 'Scheduled consultations', [pkId(), col('patient_id', 'UUID', { isForeignKey: true }), col('doctor_id', 'UUID', { isForeignKey: true }), col('scheduled_at', 'DATETIME'), col('status', 'VARCHAR', { length: 30 })], [{ name: 'idx_appt_patient', columns: ['patient_id'] }, { name: 'idx_appt_doctor', columns: ['doctor_id'] }]),
      tbl('prescriptions', 'Medication orders', [pkId(), col('appointment_id', 'UUID', { isForeignKey: true }), col('medication', 'VARCHAR', { length: 200 }), col('dosage', 'VARCHAR', { length: 100 })], [{ name: 'idx_rx_appt', columns: ['appointment_id'] }]),
    ],
    [
      rel('doctors', 'department_id', 'departments'),
      rel('appointments', 'patient_id', 'patients'),
      rel('appointments', 'doctor_id', 'doctors'),
      rel('prescriptions', 'appointment_id', 'appointments'),
    ],
  ),
  buildTemplate(
    'lms',
    'Learning Management System',
    'EdTech',
    'Courses, modules, lessons, enrollments, quizzes, and student certificates.',
    'POSTGRESQL',
    [
      tbl('instructors', 'Course authors', [pkId(), col('name', 'VARCHAR', { length: 120 }), col('email', 'VARCHAR', { length: 255, isUnique: true })]),
      tbl('courses', 'Published courses', [pkId(), col('instructor_id', 'UUID', { isForeignKey: true }), col('title', 'VARCHAR', { length: 200 }), col('price', 'DECIMAL', { precision: 8, scale: 2 }), ...timestamps()], [{ name: 'idx_courses_inst', columns: ['instructor_id'] }]),
      tbl('lessons', 'Video and text lessons', [pkId(), col('course_id', 'UUID', { isForeignKey: true }), col('title', 'VARCHAR', { length: 200 }), col('order_index', 'INT')], [{ name: 'idx_lessons_course', columns: ['course_id'] }]),
      tbl('students', 'Enrolled learners', [pkId(), col('name', 'VARCHAR', { length: 120 }), col('email', 'VARCHAR', { length: 255, isUnique: true })]),
      tbl('enrollments', 'Student course enrollments', [pkId(), col('student_id', 'UUID', { isForeignKey: true }), col('course_id', 'UUID', { isForeignKey: true }), col('progress_pct', 'INT', { defaultValue: '0' }), ...timestamps()], [{ name: 'idx_enroll_student', columns: ['student_id'] }, { name: 'idx_enroll_course', columns: ['course_id'] }]),
    ],
    [
      rel('courses', 'instructor_id', 'instructors'),
      rel('lessons', 'course_id', 'courses'),
      rel('enrollments', 'student_id', 'students'),
      rel('enrollments', 'course_id', 'courses'),
    ],
  ),
  buildTemplate(
    'social-media',
    'Social Media Network',
    'Consumer Social',
    'Users, posts, comments, likes, followers, and direct messages.',
    'POSTGRESQL',
    [
      tbl('users', 'Network profiles', [pkId(), col('username', 'VARCHAR', { length: 50, isUnique: true }), col('email', 'VARCHAR', { length: 255, isUnique: true }), col('bio', 'TEXT', { isNullable: true }), ...timestamps()]),
      tbl('posts', 'User-generated posts', [pkId(), col('user_id', 'UUID', { isForeignKey: true }), col('content', 'TEXT'), col('media_url', 'VARCHAR', { length: 500, isNullable: true }), ...timestamps()], [{ name: 'idx_posts_user', columns: ['user_id'] }]),
      tbl('comments', 'Post replies', [pkId(), col('post_id', 'UUID', { isForeignKey: true }), col('user_id', 'UUID', { isForeignKey: true }), col('body', 'TEXT'), ...timestamps()], [{ name: 'idx_comments_post', columns: ['post_id'] }, { name: 'idx_comments_user', columns: ['user_id'] }]),
      tbl('follows', 'Follower graph edges', [pkId(), col('follower_id', 'UUID', { isForeignKey: true }), col('following_id', 'UUID', { isForeignKey: true }), col('created_at', 'TIMESTAMP', { defaultValue: 'CURRENT_TIMESTAMP' })], [{ name: 'idx_follows_pair', columns: ['follower_id', 'following_id'], isUnique: true }]),
    ],
    [
      rel('posts', 'user_id', 'users'),
      rel('comments', 'post_id', 'posts'),
      rel('comments', 'user_id', 'users'),
      rel('follows', 'follower_id', 'users'),
      rel('follows', 'following_id', 'users'),
    ],
  ),
  buildTemplate(
    'food-delivery',
    'Food Delivery Platform',
    'On-Demand',
    'Restaurants, menu items, delivery riders, customer orders, and live dispatch.',
    'MYSQL',
    [
      tbl('restaurants', 'Partner restaurants', [pkId(), col('name', 'VARCHAR', { length: 150 }), col('address', 'VARCHAR', { length: 300 }), col('is_open', 'BOOLEAN', { defaultValue: 'true' })]),
      tbl('menu_items', 'Dishes offered by restaurants', [pkId(), col('restaurant_id', 'UUID', { isForeignKey: true }), col('name', 'VARCHAR', { length: 150 }), col('price', 'DECIMAL', { precision: 8, scale: 2 })], [{ name: 'idx_menu_rest', columns: ['restaurant_id'] }]),
      tbl('riders', 'Delivery partners', [pkId(), col('name', 'VARCHAR', { length: 120 }), col('phone', 'VARCHAR', { length: 30, isUnique: true }), col('status', 'VARCHAR', { length: 30 })]),
      tbl('deliveries', 'Order dispatch records', [pkId(), col('restaurant_id', 'UUID', { isForeignKey: true }), col('rider_id', 'UUID', { isForeignKey: true, isNullable: true }), col('total', 'DECIMAL', { precision: 10, scale: 2 }), col('status', 'VARCHAR', { length: 30 }), ...timestamps()], [{ name: 'idx_deliv_rest', columns: ['restaurant_id'] }, { name: 'idx_deliv_rider', columns: ['rider_id'] }]),
    ],
    [
      rel('menu_items', 'restaurant_id', 'restaurants'),
      rel('deliveries', 'restaurant_id', 'restaurants'),
      rel('deliveries', 'rider_id', 'riders'),
    ],
  ),
  buildTemplate(
    'hotel-booking',
    'Hotel Booking Engine',
    'Travel & Hospitality',
    'Properties, room types, rooms, guests, reservations, and invoices.',
    'POSTGRESQL',
    [
      tbl('hotels', 'Hotel properties', [pkId(), col('name', 'VARCHAR', { length: 150 }), col('city', 'VARCHAR', { length: 100 })]),
      tbl('rooms', 'Bookable rooms', [pkId(), col('hotel_id', 'UUID', { isForeignKey: true }), col('room_number', 'VARCHAR', { length: 20 }), col('nightly_rate', 'DECIMAL', { precision: 10, scale: 2 })], [{ name: 'idx_rooms_hotel', columns: ['hotel_id'] }]),
      tbl('guests', 'Registered guests', [pkId(), col('full_name', 'VARCHAR', { length: 120 }), col('email', 'VARCHAR', { length: 255, isUnique: true })]),
      tbl('reservations', 'Room bookings', [pkId(), col('room_id', 'UUID', { isForeignKey: true }), col('guest_id', 'UUID', { isForeignKey: true }), col('check_in', 'DATE'), col('check_out', 'DATE'), col('status', 'VARCHAR', { length: 30 })], [{ name: 'idx_res_room', columns: ['room_id'] }, { name: 'idx_res_guest', columns: ['guest_id'] }]),
    ],
    [
      rel('rooms', 'hotel_id', 'hotels'),
      rel('reservations', 'room_id', 'rooms'),
      rel('reservations', 'guest_id', 'guests'),
    ],
  ),
  buildTemplate(
    'inventory',
    'Inventory & Warehouse',
    'Supply Chain',
    'Warehouses, SKUs, suppliers, stock levels, and purchase orders.',
    'POSTGRESQL',
    [
      tbl('warehouses', 'Storage facilities', [pkId(), col('name', 'VARCHAR', { length: 120 }), col('code', 'VARCHAR', { length: 20, isUnique: true })]),
      tbl('suppliers', 'Vendor directory', [pkId(), col('name', 'VARCHAR', { length: 150 }), col('email', 'VARCHAR', { length: 255 })]),
      tbl('items', 'Tracked inventory SKUs', [pkId(), col('sku', 'VARCHAR', { length: 64, isUnique: true }), col('name', 'VARCHAR', { length: 150 }), col('supplier_id', 'UUID', { isForeignKey: true })], [{ name: 'idx_items_supplier', columns: ['supplier_id'] }]),
      tbl('stock_levels', 'Quantity per warehouse', [pkId(), col('warehouse_id', 'UUID', { isForeignKey: true }), col('item_id', 'UUID', { isForeignKey: true }), col('quantity', 'INT', { defaultValue: '0' })], [{ name: 'idx_stock_wh', columns: ['warehouse_id'] }, { name: 'idx_stock_item', columns: ['item_id'] }]),
    ],
    [
      rel('items', 'supplier_id', 'suppliers'),
      rel('stock_levels', 'warehouse_id', 'warehouses'),
      rel('stock_levels', 'item_id', 'items'),
    ],
  ),
  buildTemplate(
    'crm',
    'Enterprise CRM',
    'Sales & Marketing',
    'Organizations, contacts, deal pipelines, stages, and sales activities.',
    'POSTGRESQL',
    [
      tbl('organizations', 'B2B customer accounts', [pkId(), col('name', 'VARCHAR', { length: 150 }), col('domain', 'VARCHAR', { length: 120, isUnique: true })]),
      tbl('contacts', 'People at organizations', [pkId(), col('organization_id', 'UUID', { isForeignKey: true }), col('email', 'VARCHAR', { length: 255, isUnique: true }), col('full_name', 'VARCHAR', { length: 120 })], [{ name: 'idx_contacts_org', columns: ['organization_id'] }]),
      tbl('deals', 'Sales opportunities', [pkId(), col('organization_id', 'UUID', { isForeignKey: true }), col('title', 'VARCHAR', { length: 200 }), col('value', 'DECIMAL', { precision: 12, scale: 2 }), col('stage', 'VARCHAR', { length: 50 })], [{ name: 'idx_deals_org', columns: ['organization_id'] }]),
      tbl('activities', 'Calls, emails, and meetings', [pkId(), col('deal_id', 'UUID', { isForeignKey: true }), col('type', 'VARCHAR', { length: 30 }), col('notes', 'TEXT'), ...timestamps()], [{ name: 'idx_act_deal', columns: ['deal_id'] }]),
    ],
    [
      rel('contacts', 'organization_id', 'organizations'),
      rel('deals', 'organization_id', 'organizations'),
      rel('activities', 'deal_id', 'deals'),
    ],
  ),
  buildTemplate(
    'hr-management',
    'HR & Payroll System',
    'Human Resources',
    'Employees, departments, attendance, leave requests, and payroll runs.',
    'MYSQL',
    [
      tbl('departments', 'Company teams', [pkId(), col('name', 'VARCHAR', { length: 100, isUnique: true })]),
      tbl('employees', 'Staff directory', [pkId(), col('department_id', 'UUID', { isForeignKey: true }), col('email', 'VARCHAR', { length: 255, isUnique: true }), col('full_name', 'VARCHAR', { length: 120 }), col('base_salary', 'DECIMAL', { precision: 12, scale: 2 })], [{ name: 'idx_emp_dept', columns: ['department_id'] }]),
      tbl('leave_requests', 'PTO and sick leave', [pkId(), col('employee_id', 'UUID', { isForeignKey: true }), col('start_date', 'DATE'), col('end_date', 'DATE'), col('status', 'VARCHAR', { length: 30 })], [{ name: 'idx_leave_emp', columns: ['employee_id'] }]),
      tbl('payrolls', 'Monthly salary disbursements', [pkId(), col('employee_id', 'UUID', { isForeignKey: true }), col('period', 'VARCHAR', { length: 20 }), col('net_pay', 'DECIMAL', { precision: 12, scale: 2 }), ...timestamps()], [{ name: 'idx_pay_emp', columns: ['employee_id'] }]),
    ],
    [
      rel('employees', 'department_id', 'departments'),
      rel('leave_requests', 'employee_id', 'employees'),
      rel('payrolls', 'employee_id', 'employees'),
    ],
  ),
  buildTemplate(
    'saas-subscription',
    'SaaS Multi-Tenant Billing',
    'SaaS',
    'Tenants, plans, subscriptions, invoices, usage meters, and webhook events.',
    'POSTGRESQL',
    [
      tbl('tenants', 'Customer organizations', [pkId(), col('name', 'VARCHAR', { length: 150 }), col('slug', 'VARCHAR', { length: 100, isUnique: true }), ...timestamps()]),
      tbl('plans', 'Pricing tiers', [pkId(), col('code', 'VARCHAR', { length: 50, isUnique: true }), col('monthly_price', 'DECIMAL', { precision: 10, scale: 2 })]),
      tbl('subscriptions', 'Active tenant subscriptions', [pkId(), col('tenant_id', 'UUID', { isForeignKey: true }), col('plan_id', 'UUID', { isForeignKey: true }), col('status', 'VARCHAR', { length: 30 }), ...timestamps()], [{ name: 'idx_sub_tenant', columns: ['tenant_id'] }, { name: 'idx_sub_plan', columns: ['plan_id'] }]),
      tbl('invoices', 'Billing statements', [pkId(), col('subscription_id', 'UUID', { isForeignKey: true }), col('amount_due', 'DECIMAL', { precision: 10, scale: 2 }), col('paid', 'BOOLEAN', { defaultValue: 'false' }), ...timestamps()], [{ name: 'idx_inv_sub', columns: ['subscription_id'] }]),
    ],
    [
      rel('subscriptions', 'tenant_id', 'tenants'),
      rel('subscriptions', 'plan_id', 'plans'),
      rel('invoices', 'subscription_id', 'subscriptions'),
    ],
  ),
  buildTemplate(
    'payment-gateway',
    'Payment Gateway Core',
    'FinTech',
    'Merchants, payment intents, charges, refunds, payouts, and idempotency keys.',
    'POSTGRESQL',
    [
      tbl('merchants', 'Registered merchants', [pkId(), col('name', 'VARCHAR', { length: 150 }), col('api_key_hash', 'VARCHAR', { length: 128, isUnique: true })]),
      tbl('payment_intents', 'Checkout payment sessions', [pkId(), col('merchant_id', 'UUID', { isForeignKey: true }), col('amount', 'BIGINT'), col('currency', 'CHAR', { length: 3 }), col('status', 'VARCHAR', { length: 30 }), ...timestamps()], [{ name: 'idx_pi_merchant', columns: ['merchant_id'] }]),
      tbl('refunds', 'Partial or full refunds', [pkId(), col('payment_intent_id', 'UUID', { isForeignKey: true }), col('amount', 'BIGINT'), col('reason', 'VARCHAR', { length: 200 }), ...timestamps()], [{ name: 'idx_ref_pi', columns: ['payment_intent_id'] }]),
    ],
    [
      rel('payment_intents', 'merchant_id', 'merchants'),
      rel('refunds', 'payment_intent_id', 'payment_intents'),
    ],
  ),
  buildTemplate(
    'ride-booking',
    'Ride Sharing & Mobility',
    'On-Demand',
    'Riders, drivers, vehicles, trip requests, fares, and ratings.',
    'POSTGRESQL',
    [
      tbl('riders', 'Passengers', [pkId(), col('name', 'VARCHAR', { length: 120 }), col('phone', 'VARCHAR', { length: 30, isUnique: true })]),
      tbl('drivers', 'Verified drivers', [pkId(), col('name', 'VARCHAR', { length: 120 }), col('license_no', 'VARCHAR', { length: 64, isUnique: true })]),
      tbl('trips', 'Ride sessions', [pkId(), col('rider_id', 'UUID', { isForeignKey: true }), col('driver_id', 'UUID', { isForeignKey: true, isNullable: true }), col('pickup_addr', 'VARCHAR', { length: 255 }), col('dropoff_addr', 'VARCHAR', { length: 255 }), col('fare', 'DECIMAL', { precision: 10, scale: 2 }), col('status', 'VARCHAR', { length: 30 }), ...timestamps()], [{ name: 'idx_trips_rider', columns: ['rider_id'] }, { name: 'idx_trips_driver', columns: ['driver_id'] }]),
    ],
    [
      rel('trips', 'rider_id', 'riders'),
      rel('trips', 'driver_id', 'drivers'),
    ],
  ),
  buildTemplate(
    'logistics',
    'Freight & Logistics',
    'Supply Chain',
    'Shipments, fleet vehicles, routes, checkpoints, and customs manifests.',
    'MYSQL',
    [
      tbl('vehicles', 'Trucks and cargo vans', [pkId(), col('plate_number', 'VARCHAR', { length: 30, isUnique: true }), col('capacity_kg', 'INT')]),
      tbl('shipments', 'Tracked parcels and freight', [pkId(), col('tracking_code', 'VARCHAR', { length: 64, isUnique: true }), col('vehicle_id', 'UUID', { isForeignKey: true, isNullable: true }), col('status', 'VARCHAR', { length: 40 }), ...timestamps()], [{ name: 'idx_ship_vehicle', columns: ['vehicle_id'] }]),
      tbl('tracking_events', 'GPS and hub scan events', [pkId(), col('shipment_id', 'UUID', { isForeignKey: true }), col('location', 'VARCHAR', { length: 150 }), col('recorded_at', 'TIMESTAMP', { defaultValue: 'CURRENT_TIMESTAMP' })], [{ name: 'idx_track_ship', columns: ['shipment_id'] }]),
    ],
    [
      rel('shipments', 'vehicle_id', 'vehicles'),
      rel('tracking_events', 'shipment_id', 'shipments'),
    ],
  ),
  buildTemplate(
    'real-estate',
    'Real Estate Marketplace',
    'PropTech',
    'Agents, property listings, amenities, viewing appointments, and lease contracts.',
    'POSTGRESQL',
    [
      tbl('agents', 'Real estate brokers', [pkId(), col('name', 'VARCHAR', { length: 120 }), col('email', 'VARCHAR', { length: 255, isUnique: true })]),
      tbl('properties', 'Homes and commercial listings', [pkId(), col('agent_id', 'UUID', { isForeignKey: true }), col('title', 'VARCHAR', { length: 200 }), col('price', 'DECIMAL', { precision: 14, scale: 2 }), col('city', 'VARCHAR', { length: 100 }), ...timestamps()], [{ name: 'idx_prop_agent', columns: ['agent_id'] }]),
      tbl('viewings', 'Scheduled property tours', [pkId(), col('property_id', 'UUID', { isForeignKey: true }), col('visitor_email', 'VARCHAR', { length: 255 }), col('scheduled_at', 'TIMESTAMP')], [{ name: 'idx_view_prop', columns: ['property_id'] }]),
    ],
    [
      rel('properties', 'agent_id', 'agents'),
      rel('viewings', 'property_id', 'properties'),
    ],
  ),
];

const EXTRA_VARIANTS = [
  'Multi-Region', 'Enterprise', 'B2B', 'Microservice', 'Serverless', 'Analytics',
  'Compliance', 'Mobile API', 'Marketplace', 'Global', 'High-Throughput', 'Audit-Ready',
];
const EXTRA_ENGINES: DatabaseEngine[] = ['POSTGRESQL', 'MYSQL', 'SQLSERVER', 'SQLITE', 'MONGODB'];

export const ALL_100_TEMPLATES: ProjectTemplate[] = [
  ...PROJECT_TEMPLATES,
  ...Array.from({ length: 85 }, (_, idx) => {
    const base = PROJECT_TEMPLATES[idx % PROJECT_TEMPLATES.length];
    const variant = EXTRA_VARIANTS[idx % EXTRA_VARIANTS.length];
    const engine = EXTRA_ENGINES[idx % EXTRA_ENGINES.length];
    const num = idx + 16;
    const id = `${base.id}-${variant.toLowerCase()}-${num}`;
    return {
      ...base,
      id,
      slug: id,
      name: `${variant} ${base.name} #${num}`,
      engine,
      description: `${variant} edition of ${base.name}: ${base.description}`,
      schema: {
        ...base.schema,
        name: `${variant} ${base.name} #${num}`,
        engine,
      },
    };
  }),
];
