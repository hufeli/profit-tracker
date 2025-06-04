
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get all entries for the user and a specific dashboard
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { dashboardId } = req.query as { dashboardId?: string }; // dashboardId from query parameters

    if (!dashboardId) {
        return res.status(400).json({ message: 'Dashboard ID is required.' });
    }

    const result = await query('SELECT id, date_key, final_balance, tags, notes FROM daily_entries WHERE user_id = $1 AND dashboard_id = $2 ORDER BY date_key ASC', [userId, dashboardId]);
    // Transform to the { [dateKey]: DailyEntry } structure expected by frontend
    const entriesMap: { [dateKey: string]: any } = {};
    result.rows.forEach(row => {
      entriesMap[row.date_key] = {
        id: row.id, 
        finalBalance: parseFloat(row.final_balance),
        tags: row.tags || [],
        notes: row.notes || ''
      };
    });
    res.json(entriesMap);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ message: 'Failed to fetch entries.' });
  }
});

// Add or Update a daily entry (UPSERT based on user_id, dashboard_id, and date_key)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    // dashboard_id now comes from req.body as per App.tsx
    const { date_key, final_balance, tags, notes, dashboard_id } = req.body;

    if (!date_key || typeof final_balance !== 'number' || final_balance < 0 || !dashboard_id) {
      return res.status(400).json({ message: 'Invalid entry data. Date, valid final balance, and dashboard ID are required.' });
    }
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_key)) {
        return res.status(400).json({ message: 'Invalid date_key format. Expected YYYY-MM-DD.' });
    }

    // Verify dashboard ownership
    const dashboardCheck = await query('SELECT id FROM dashboards WHERE id = $1 AND user_id = $2', [dashboard_id, userId]);
    if (dashboardCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access to this dashboard is forbidden or dashboard does not exist.' });
    }

    const result = await query(
      \`INSERT INTO daily_entries (user_id, dashboard_id, date_key, final_balance, tags, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id, dashboard_id, date_key) DO UPDATE SET
         final_balance = EXCLUDED.final_balance,
         tags = EXCLUDED.tags,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING id, date_key, final_balance, tags, notes, dashboard_id\`,
      [userId, dashboard_id, date_key, final_balance, tags || [], notes || null]
    );
    
    const newEntry = result.rows[0];
     res.status(201).json({
        [newEntry.date_key]: {
            id: newEntry.id,
            finalBalance: parseFloat(newEntry.final_balance),
            tags: newEntry.tags || [],
            notes: newEntry.notes || '',
            // dashboard_id: newEntry.dashboard_id // Optionally return dashboard_id if frontend needs to confirm
        }
    });
  } catch (error) {
    console.error('Error saving entry:', error);
    res.status(500).json({ message: 'Failed to save entry.' });
  }
});

export default router;
