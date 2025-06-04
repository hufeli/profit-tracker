
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get settings
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { dashboardId } = req.query as { dashboardId?: string }; 

    if (!dashboardId) {
        return res.status(400).json({ message: 'Dashboard ID is required.' });
    }

    const result = await query('SELECT currency, enable_notifications, notification_time FROM app_settings WHERE user_id = $1 AND dashboard_id = $2', [userId, dashboardId]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // Default settings if none found for this dashboard
      res.json({ currency: 'BRL', enable_notifications: false, notification_time: '18:00', dashboard_id: dashboardId });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings.' });
  }
});

// Update settings (UPSERT logic)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currency, enable_notifications, notification_time, dashboard_id } = req.body;

    if (!currency || typeof enable_notifications !== 'boolean' || !notification_time || !dashboard_id) {
        return res.status(400).json({ message: 'Missing required settings fields (currency, enable_notifications, notification_time, dashboard_id) or invalid types.' });
    }
     // Verify dashboard ownership (optional but good practice)
    const dashboardCheck = await query('SELECT id FROM dashboards WHERE id = $1 AND user_id = $2', [dashboard_id, userId]);
    if (dashboardCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access to this dashboard is forbidden or dashboard does not exist.' });
    }

    const result = await query(
      `INSERT INTO app_settings (user_id, dashboard_id, currency, enable_notifications, notification_time, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, dashboard_id) DO UPDATE SET
         currency = EXCLUDED.currency,
         enable_notifications = EXCLUDED.enable_notifications,
         notification_time = EXCLUDED.notification_time,
         updated_at = NOW()
       RETURNING currency, enable_notifications, notification_time, dashboard_id`,
      [userId, dashboard_id, currency, enable_notifications, notification_time]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update settings.' });
  }
});

export default router;
