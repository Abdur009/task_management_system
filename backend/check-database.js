const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "taskdb",
});

console.log("Checking database structure...\n");

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }

  console.log("✅ Connected to database\n");

  // Check if tasks table exists
  db.query(
    "SHOW TABLES LIKE 'tasks'",
    (err, results) => {
      if (err) {
        console.error("❌ Error checking tables:", err.message);
        db.end();
        process.exit(1);
      }

      if (results.length === 0) {
        console.log("❌ Tasks table does not exist!");
        console.log("   Please create the tasks table first.\n");
        db.end();
        process.exit(1);
      }

      console.log("✅ Tasks table exists\n");

      // Check if user_id column exists
      db.query(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks'",
        [process.env.DB_NAME || "taskdb"],
        (err, columns) => {
          if (err) {
            console.error("❌ Error checking columns:", err.message);
            db.end();
            process.exit(1);
          }

          console.log("Tasks table columns:");
          columns.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
          });

          const hasUserId = columns.some(col => col.COLUMN_NAME === 'user_id');
          
          if (!hasUserId) {
            console.log("\n❌ user_id column is MISSING!");
            console.log("   Run this SQL to fix it:");
            console.log("   ALTER TABLE tasks ADD COLUMN user_id INT NOT NULL;");
            console.log("   ALTER TABLE tasks ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;");
          } else {
            console.log("\n✅ user_id column exists");
            
            // Check if foreign key exists
            db.query(
              "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'user_id' AND REFERENCED_TABLE_NAME = 'users'",
              [process.env.DB_NAME || "taskdb"],
              (err, fkResults) => {
                if (err) {
                  console.error("❌ Error checking foreign key:", err.message);
                } else if (fkResults.length === 0) {
                  console.log("\n⚠️  Foreign key constraint is MISSING!");
                  console.log("   Run this SQL to fix it:");
                  console.log("   ALTER TABLE tasks ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;");
                } else {
                  console.log("\n✅ Foreign key constraint exists");
                }
                
                console.log("\n✅ Database structure looks good!");
                db.end();
              }
            );
          }
        }
      );
    }
  );
});

