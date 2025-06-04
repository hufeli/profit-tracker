
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

// Update a dashboard name
router.put('/:dashboardId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { dashboardId } = req.params;
    const { name } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Dashboard name is required.' });
    }

    // Verify dashboard ownership
    const dashboardCheck = await query('SELECT id FROM dashboards WHERE id = $1 AND user_id = $2', [dashboardId, userId]);
    if (dashboardCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Dashboard not found.' });
    }

    // Check for name conflict
    const conflict = await query(
      'SELECT id FROM dashboards WHERE user_id = $1 AND name = $2 AND id <> $3',
      [userId, name.trim(), dashboardId]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ message: 'A dashboard with this name already exists.' });
    }

    const result = await query(
      'UPDATE dashboards SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, name, user_id, created_at, updated_at',
      [name.trim(), dashboardId, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    res.status(500).json({ message: 'Failed to update dashboard.' });
  }
});

// Delete a dashboard and cascade related data via DB constraints
router.delete('/:dashboardId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { dashboardId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    const result = await query('DELETE FROM dashboards WHERE id = $1 AND user_id = $2 RETURNING id', [dashboardId, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Dashboard not found.' });
    }

    res.json({ message: 'Dashboard deleted successfully.', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    res.status(500).json({ message: 'Failed to delete dashboard.' });
  }
});

export default router;
