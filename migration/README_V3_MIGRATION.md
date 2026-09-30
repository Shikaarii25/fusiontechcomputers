# V3 → V4 migration

V3 uses MariaDB 10.4.x in XAMPP; V4 uses PostgreSQL. A MariaDB `data` folder cannot be copied into V4.

For a safe migration:

1. Keep the working V3 installation untouched.
2. Make a backup of the V3 database from phpMyAdmin (`fusiontech`) before any export.
3. Export logical data from these application tables as needed:
   - `site_settings`
   - `services`
   - `products`
   - `gallery`
   - `enquiries`
   - `customers`
   - `customer_notes`
   - `service_jobs`
   - `quotes` + `quote_items`
   - `invoices` + `invoice_items`
   - `inventory_items`
   - `inventory_movements`
4. Do NOT export/copy the MariaDB system tables such as `mysql.db` into PostgreSQL.
5. Transform the SQL/data to PostgreSQL types and import into the V4 database.
6. Verify record counts and totals before switching public traffic.

Because each V3 database may contain user-created content and old image paths, this project intentionally does not overwrite cloud data or guess a migration mapping. The V4 database can be populated manually first, then migrated in a controlled pass.
