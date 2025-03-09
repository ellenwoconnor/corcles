
import { pool } from './db';
import logger from './logger';

async function migrateItemsWishlist() {
  try {
    logger.info('Starting items wishlistId migration');
    
    // Check if the column exists first
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'wishlist_id';
    `;
    
    const columnCheck = await pool.query(checkColumnQuery);
    
    if (columnCheck.rows.length === 0) {
      // Add the column if it doesn't exist
      const addColumnQuery = `
        ALTER TABLE items
        ADD COLUMN wishlist_id INTEGER;
      `;
      
      await pool.query(addColumnQuery);
      logger.info('Successfully added wishlist_id column to items table');
    } else {
      logger.info('wishlist_id column already exists in items table');
    }
    
  } catch (error) {
    logger.error('Error in items wishlistId migration:', error);
    throw error;
  }
}

// Execute migration if this file is run directly
if (require.main === module) {
  migrateItemsWishlist()
    .then(() => {
      logger.info('Items wishlistId migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Items wishlistId migration failed:', error);
      process.exit(1);
    });
}
