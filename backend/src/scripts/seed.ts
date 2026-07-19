import bcrypt from 'bcryptjs';
import { query } from '../database/pool';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // 1. Clear existing data
    console.log('Clearing existing data...');
    await query('TRUNCATE TABLE users CASCADE');
    await query('TRUNCATE TABLE food_database CASCADE');

    // 2. Hash default password
    const passwordHash = await bcrypt.hash('password123', 10);

    // 3. Seed Users
    console.log('Seeding users...');
    const userIds = {
      individual1: uuidv4(),
      individual2: uuidv4(),
      provider: uuidv4(),
      admin: uuidv4(),
    };

    const usersQuery = `
      INSERT INTO users (id, email, password_hash, role, first_name, last_name)
      VALUES 
        ($1, 'patient1@vitalloop.com', $5, 'individual', 'Alice', 'Smith'),
        ($2, 'patient2@vitalloop.com', $5, 'individual', 'Bob', 'Johnson'),
        ($3, 'dr.jones@vitalloop.com', $5, 'provider', 'Sarah', 'Jones'),
        ($4, 'admin@vitalloop.com', $5, 'institution_admin', 'Admin', 'User')
    `;
    await query(usersQuery, [userIds.individual1, userIds.individual2, userIds.provider, userIds.admin, passwordHash]);

    // 4. Seed Provider-Patient relationships
    console.log('Seeding provider-patient relationships...');
    await query(`
      INSERT INTO provider_patients (provider_id, patient_id, status)
      VALUES 
        ($1, $2, 'active'),
        ($1, $3, 'active')
    `, [userIds.provider, userIds.individual1, userIds.individual2]);

    // 5. Seed Food Database
    console.log('Seeding food database...');
    const foodIds = {
      apple: uuidv4(),
      chicken: uuidv4(),
      rice: uuidv4(),
    };

    await query(`
      INSERT INTO food_database (id, name, category, calories_per_100g, carbs_g, protein_g, fat_g, fiber_g, gi_index)
      VALUES 
        ($1, 'Apple', 'Fruit', 52, 14, 0.3, 0.2, 2.4, 36),
        ($2, 'Chicken Breast', 'Meat', 165, 0, 31, 3.6, 0, 0),
        ($3, 'Brown Rice', 'Grain', 111, 23, 2.6, 0.9, 1.8, 50)
    `, [foodIds.apple, foodIds.chicken, foodIds.rice]);

    // 6. Seed Glucose Readings for Alice
    console.log('Seeding glucose readings...');
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Fasting (Morning)
      const fastingDate = new Date(date);
      fastingDate.setHours(7, 30, 0, 0);
      await query(`
        INSERT INTO glucose_readings (user_id, value_mg_dl, reading_type, measured_at)
        VALUES ($1, $2, 'fasting', $3)
      `, [userIds.individual1, 95 + Math.random() * 20, fastingDate.toISOString()]);

      // Post-Meal (Afternoon)
      const postMealDate = new Date(date);
      postMealDate.setHours(14, 0, 0, 0);
      await query(`
        INSERT INTO glucose_readings (user_id, value_mg_dl, reading_type, measured_at)
        VALUES ($1, $2, 'post_meal', $3)
      `, [userIds.individual1, 120 + Math.random() * 40, postMealDate.toISOString()]);
    }

    // 7. Seed Meals for Alice
    console.log('Seeding meals...');
    const mealId = uuidv4();
    await query(`
      INSERT INTO meals (id, user_id, meal_type, logged_at, total_calories, total_carbs_g, total_protein_g, total_fat_g, total_fiber_g)
      VALUES ($1, $2, 'lunch', $3, 438, 37, 33.6, 4.5, 4.2)
    `, [mealId, userIds.individual1, new Date().toISOString()]);

    await query(`
      INSERT INTO meal_items (meal_id, food_id, food_name, portion_grams, calories, carbs_g, protein_g, fat_g, fiber_g)
      VALUES 
        ($1, $2, 'Chicken Breast', 150, 247.5, 0, 46.5, 5.4, 0),
        ($1, $3, 'Brown Rice', 100, 111, 23, 2.6, 0.9, 1.8),
        ($1, $4, 'Apple', 150, 78, 21, 0.45, 0.3, 3.6)
    `, [mealId, foodIds.chicken, foodIds.rice, foodIds.apple]);

    // 8. Seed Breathing Sessions
    console.log('Seeding breathing sessions...');
    await query(`
      INSERT INTO breathing_sessions (user_id, session_type, duration_seconds, started_at, completed_at, completion_status)
      VALUES 
        ($1, 'box', 300, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '5 minutes', 'completed'),
        ($1, 'paced', 600, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', 'completed')
    `, [userIds.individual1]);

    // 9. Seed Weight Entries
    console.log('Seeding weight entries...');
    await query(`
      INSERT INTO weight_entries (user_id, weight_kg, measured_at)
      VALUES 
        ($1, 75.5, NOW() - INTERVAL '14 days'),
        ($1, 75.0, NOW() - INTERVAL '7 days'),
        ($1, 74.2, NOW())
    `, [userIds.individual1]);

    // 10. Seed Predictions
    console.log('Seeding predictions...');
    await query(`
      INSERT INTO predictions (user_id, risk_level, risk_score, factors, actions, explanation, created_at)
      VALUES ($1, 'low', 15.5, '[{"factor": "Stable fasting glucose", "impact": "positive"}]', '[{"action": "Maintain current diet", "type": "diet"}]', 'Your glucose has been stable over the past 7 days.', NOW())
    `, [userIds.individual1]);

    // 11. Seed Alerts
    console.log('Seeding alerts...');
    await query(`
      INSERT INTO alerts (user_id, type, severity, title, message)
      VALUES 
        ($1, 'coaching_nudge', 'info', 'Great Job!', 'You logged 3 meals yesterday. Keep it up!'),
        ($1, 'trend', 'warning', 'Slight Glucose Elevation', 'Your post-meal glucose is trending slightly higher this week.')
    `, [userIds.individual1]);

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  seed();
}
