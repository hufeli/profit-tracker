
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get all dashboards for the authenticated user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      // This case should ideally be caught by authMiddleware already
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    const result = await query('SELECT id, name, user_id, created_at, updated_at FROM dashboards WHERE user_id = $1 ORDER BY created_at ASC', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    res.status(500).json({ message: 'Failed to fetch dashboards.' });
  }
});

// Create a new dashboard
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name } = req.body;

    if (!userId) {
      // This case should ideally be caught by authMiddleware already
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Dashboard name is required.' });
    }
    if (name.trim().length > 100) {
        return res.status(400).json({ message: 'Dashboard name is too long (max 100 characters).' });
    }

    // Check for existing dashboard with the same name for this user
    const existingDashboard = await query('SELECT id FROM dashboards WHERE user_id = $1 AND name = $2', [userId, name.trim()]);
    if (existingDashboard.rows.length > 0) {
        return res.status(409).json({ message: 'A dashboard with this name already exists.' });
    }

    const result = await query(
      'INSERT INTO dashboards (user_id, name) VALUES ($1, $2) RETURNING id, name, user_id, created_at, updated_at',
      [userId, name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating dashboard:', error);
    // The unique constraint on (user_id, name) would also throw error.code '23505'
    // if not caught by the explicit check above, so this is a fallback.
    if (error.code === '23505') { 
      return res.status(409).json({ message: 'A dashboard with this name already exists.' });
    }
    res.status(500).json({ message: 'Failed to create dashboard.' });
  }
});

// TODO: Implement PUT /:dashboardId to update dashboard name
// TODO: Implement DELETE /:dashboardId to delete a dashboard (and decide on cascading data)

export default router;
