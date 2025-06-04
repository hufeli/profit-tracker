
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get all goals for the user and a specific dashboard
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { dashboardId } = req.query as { dashboardId?: string }; // dashboardId from query parameters

    if (!dashboardId) {
        return res.status(400).json({ message: 'Dashboard ID is required.'});
    }
    const result = await query('SELECT id, type, amount, applies_to, dashboard_id FROM goals WHERE user_id = $1 AND dashboard_id = $2 ORDER BY applies_to ASC', [userId, dashboardId]);
    res.json(result.rows.map(row => ({...row, amount: parseFloat(row.amount) })));
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ message: 'Failed to fetch goals.' });
  }
});

// Add a new goal for a specific dashboard
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    // dashboard_id now comes from req.body as per App.tsx
    const { type, amount, applies_to, dashboard_id } = req.body;

    if (!type || typeof amount !== 'number' || amount <= 0 || !applies_to || !dashboard_id) {
      return res.status(400).json({ message: 'Invalid goal data. Type, amount, applies_to, and dashboard_id are required.' });
    }
    // Basic validation for applies_to based on type
    if (type === 'daily' && !/^\d{4}-\d{2}-\d{2}$/.test(applies_to)) {
        return res.status(400).json({ message: 'Invalid applies_to format for daily goal. Expected YYYY-MM-DD.' });
    }
    if (type === 'weekly' && !/^\d{4}-W\d{2}$/.test(applies_to)) { // Frontend sends YYYY-WNN
        return res.status(400).json({ message: 'Invalid applies_to format for weekly goal. Expected YYYY-WNN.' });
    }
    if (type === 'monthly' && !/^\d{4}-\d{2}$/.test(applies_to)) {
        return res.status(400).json({ message: 'Invalid applies_to format for monthly goal. Expected YYYY-MM.' });
    }

     // Verify dashboard ownership
    const dashboardCheck = await query('SELECT id FROM dashboards WHERE id = $1 AND user_id = $2', [dashboard_id, userId]);
    if (dashboardCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access to this dashboard is forbidden or dashboard does not exist.' });
    }

    const result = await query(
      'INSERT INTO goals (user_id, dashboard_id, type, amount, applies_to) VALUES ($1, $2, $3, $4, $5) RETURNING id, type, amount, applies_to, dashboard_id',
      [userId, dashboard_id, type, amount, applies_to]
    );
    const newGoal = result.rows[0];
    res.status(201).json({...newGoal, amount: parseFloat(newGoal.amount)});
  } catch (error: any) {
    console.error('Error adding goal:', error);
    if ((error as any).code === '23505') { // unique_violation if applies_to should be unique per user/type/dashboard
        return res.status(409).json({ message: 'A goal of this type for this period and dashboard may already exist.'});
    }
    res.status(500).json({ message: 'Failed to add goal.' });
  }
});

// Update a goal for a specific dashboard
router.put('/:goalId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { goalId } = req.params;
    // dashboard_id now comes from req.body as per App.tsx
    const { type, amount, applies_to, dashboard_id } = req.body;

    if (!type || typeof amount !== 'number' || amount <= 0 || !applies_to || !dashboard_id) {
      return res.status(400).json({ message: 'Invalid goal data. Type, amount, applies_to, and dashboard_id are required.' });
    }
    // Basic validation for applies_to (as in POST)
    if (type === 'daily' && !/^\d{4}-\d{2}-\d{2}$/.test(applies_to)) return res.status(400).json({ message: 'Invalid applies_to for daily goal.' });
    if (type === 'weekly' && !/^\d{4}-W\d{2}$/.test(applies_to)) return res.status(400).json({ message: 'Invalid applies_to for weekly goal.' });
    if (type === 'monthly' && !/^\d{4}-\d{2}$/.test(applies_to)) return res.status(400).json({ message: 'Invalid applies_to for monthly goal.' });


    // Verify dashboard ownership (before update)
    const dashboardCheck = await query('SELECT id FROM dashboards WHERE id = $1 AND user_id = $2', [dashboard_id, userId]);
    if (dashboardCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access to this dashboard is forbidden or dashboard does not exist.' });
    }
    // Also ensure the goal being updated belongs to the user and dashboard
    const goalCheck = await query('SELECT id FROM goals WHERE id = $1 AND user_id = $2 AND dashboard_id = $3', [goalId, userId, dashboard_id]);
    if(goalCheck.rows.length === 0){
        return res.status(404).json({ message: 'Goal not found for this user and dashboard, or you are trying to change its dashboard affiliation which is not allowed here.'})
    }


    const result = await query(
      'UPDATE goals SET type = $1, amount = $2, applies_to = $3, updated_at = NOW() WHERE id = $4 AND user_id = $5 AND dashboard_id = $6 RETURNING id, type, amount, applies_to, dashboard_id',
      [type, amount, applies_to, goalId, userId, dashboard_id]
    );

    if (result.rows.length === 0) {
      // This case might be redundant due to prior checks but kept for safety
      return res.status(404).json({ message: 'Goal not found or user not authorized to update this goal for the specified dashboard.' });
    }
    const updatedGoal = result.rows[0];
    res.json({...updatedGoal, amount: parseFloat(updatedGoal.amount)});
  } catch (error: any) {
    console.error('Error updating goal:', error);
     if ((error as any).code === '23505') { 
        return res.status(409).json({ message: 'A goal of this type for this period and dashboard may already exist (conflict with another goal).'});
    }
    res.status(500).json({ message: 'Failed to update goal.' });
  }
});

// Delete a goal for a specific dashboard
router.delete('/:goalId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { goalId } = req.params;
    const { dashboardId } = req.query as { dashboardId?: string }; // dashboardId must be passed in query for DELETE

    if (!dashboardId) {
        return res.status(400).json({ message: 'Dashboard ID is required as a query parameter.'});
    }

    const result = await query('DELETE FROM goals WHERE id = $1 AND user_id = $2 AND dashboard_id = $3 RETURNING id', [goalId, userId, dashboardId]);
    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Goal not found for this user and dashboard, or not authorized.' });
    }
    res.status(200).json({ message: 'Goal deleted successfully.', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ message: 'Failed to delete goal.' });
  }
});

export default router;
