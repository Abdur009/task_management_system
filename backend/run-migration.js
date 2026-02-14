const db = require('./db');
const fs = require('fs');
const path = require('path');

// Read the SQL file
const sqlFile = path.join(__dirname, 'add-profile-picture.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('Running database migration...');
console.log('SQL:', sql);

// Execute the SQL
db.query(sql, (err, results) => {
  if (err) {
    // Check if column already exists
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ Column profile_picture already exists. Migration not needed.');
    } else {
      console.error('✗ Migration failed:', err.message);
      console.error('Error details:', err);
      process.exit(1);
    }
  } else {
    console.log('✓ Migration completed successfully!');
    console.log('✓ profile_picture column added to users table.');
  }
  
  // Close the database connection
  db.end((err) => {
    if (err) {
      console.error('Error closing database connection:', err);
    }
    process.exit(0);
  });
});

