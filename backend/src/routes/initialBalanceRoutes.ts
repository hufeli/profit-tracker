
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get initial balance for a specific dashboard
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { dashboardId } = req.query as { dashboardId?: string }; // dashboardId from query parameters

    if (!dashboardId) {
      return res.status(400).json({ message: 'Dashboard ID is required.' });
    }

    const result = await query('SELECT balance, currency FROM initial_balances WHERE user_id = $1 AND dashboard_id = $2', [userId, dashboardId]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // It's okay for initial balance to not be set yet for a dashboard
      res.status(404).json({ message: 'Initial balance not set for this dashboard.' });
    }
  } catch (error) {
    console.error('Error fetching initial balance:', error);
    res.status(500).json({ message: 'Failed to fetch initial balance.' });
  }
});

// Set or Update initial balance for a specific dashboard (UPSERT logic)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    // dashboardId should come from query for POST consistency, or body if preferred.
    // App.tsx sends it in query: /initial-balance?dashboardId=${activeDashboard.id}
    const { dashboardId } = req.query as { dashboardId?: string }; 
    const { balance, currency } = req.body;


    if (!dashboardId || typeof dashboardId !== 'string') {
        return res.status(400).json({ message: 'Dashboard ID is required in query parameters.' });
    }
    if (typeof balance !== 'number' || balance < 0 || !currency) {
      return res.status(400).json({ message: 'Invalid balance or currency in body.' });
    }

    // Verify dashboard ownership (optional but good practice)
    const dashboardCheck = await query('SELECT id FROM dashboards WHERE id = $1 AND user_id = $2', [dashboardId, userId]);
    if (dashboardCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access to this dashboard is forbidden or dashboard does not exist.' });
    }

    const result = await query(
      \`INSERT INTO initial_balances (user_id, dashboard_id, balance, currency, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, dashboard_id) DO UPDATE SET
         balance = EXCLUDED.balance,
         currency = EXCLUDED.currency,
         updated_at = NOW()
       RETURNING balance, currency, dashboard_id\`,
      [userId, dashboardId, balance, currency]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error setting initial balance:', error);
    res.status(500).json({ message: 'Failed to set initial balance.' });
  }
});

export default router;
