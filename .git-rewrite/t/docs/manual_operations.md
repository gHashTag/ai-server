# Manual Operations Guide (Supabase SQL)

This guide documents common administrative tasks requiring manual SQL execution in the Supabase SQL Editor, particularly when API access is insufficient or direct intervention is needed.

**CRITICAL:** Always exercise extreme caution when running manual SQL queries. Verify data, especially IDs, and understand the implications of the query before execution. Whenever possible, prefer using dedicated API endpoints or functions if they exist and have the necessary permissions.

## Granting `NEUROTESTER` Subscription (or other Bonuses)

**Scenario:** You need to grant a permanent `NEUROTESTER` subscription (or another bonus/manual adjustment) to a user, often for ambassadors, testing, or manual corrections.

**Method:** Insert a record directly into the `payments_v2` table.

**Core Logic:** The system identifies the user's subscription status based on the `subscription_type` field of their *last completed* payment record in `payments_v2`. For `NEUROTESTER`, access is granted permanently regardless of the payment date or star balance. For other types, date checks apply.

**Steps:**

1.  **Identify User:** Get the `telegram_id` of the user.
2.  **Connect:** Open the Supabase SQL Editor for your project.
3.  **Verify Consistency (IMPORTANT):** Before running the `INSERT` statement, it's highly recommended to query existing `BONUS`, `Manual`, or `System` records to ensure consistency in fields like `bot_name`, `currency`, `payment_method`, `description`, `metadata`, and `inv_id` generation.
    ```sql
    -- Example query to check existing records (run this first!)
    SELECT telegram_id, bot_name, currency, type, payment_method, description, metadata, subscription_type, inv_id
    FROM payments_v2
    WHERE type = 'BONUS' OR payment_method IN ('Manual', 'System')
    ORDER BY created_at DESC
    LIMIT 5;
    ```
4.  **Prepare Query:** Adapt the following template. **Carefully review and adjust the `CHECK THIS` fields based on your findings from step 3.**

    ```sql
    -- Grant NEUROTESTER subscription to user [USER_TELEGRAM_ID]
    -- IMPORTANT: Verify fields marked << CHECK THIS >> for consistency before running!
    INSERT INTO payments_v2 (
      telegram_id,
      bot_name,         -- << CHECK THIS: Use consistent name ('system_grant', 'Manual', etc.)
      amount,
      stars,
      currency,         -- << CHECK THIS: Use consistent currency ('SYSTEM', 'RUB', 'STARS'?)
      status,
      type,             -- Should be 'BONUS' for grants/manual additions
      payment_method,   -- << CHECK THIS: Use consistent method ('Manual', 'System'?)
      description,      -- << CHECK THIS: Use consistent description format (e.g., "Grant NEUROTESTER (Ambassador)")
      metadata,         -- << CHECK THIS: Use consistent metadata (e.g., {"granted_by": "YourName/Admin"})
      subscription_type,-- Set to 'NEUROTESTER' or the specific type being granted (text)
      service_type,     -- Should be NULL for grants/income
      payment_date,     -- Usually NOW()
      inv_id            -- << CHECK THIS: Ensure uniqueness (timestamp, sequence, manual ID?)
    )
    VALUES (
      '[USER_TELEGRAM_ID]',                 -- Replace with the actual telegram_id
      'system_grant',                       -- << ADJUST THIS
      0,                                    -- No monetary amount for NEUROTESTER grant
      0,                                    -- No stars granted directly by this record
      'SYSTEM',                             -- << ADJUST THIS
      'COMPLETED',                          -- Status must be completed
      'BONUS',                              -- Type for system grants
      'Manual',                             -- << ADJUST THIS
      'Grant NEUROTESTER subscription (Manual)', -- << ADJUST THIS description
      '{"granted_by": "Admin"}',            -- << ADJUST THIS metadata
      'NEUROTESTER',                        -- The subscription type being granted
      NULL,                                 -- Service type is NULL
      NOW(),                                -- Timestamp of the grant
      EXTRACT(EPOCH FROM NOW())::bigint     -- << ADJUST THIS inv_id generation (provides basic uniqueness)
    );
    ```
5.  **Execute Query:** Run the prepared `INSERT` statement in the Supabase SQL Editor.
6.  **Verify:** Optionally, query the `payments_v2` table again for the user to confirm the record was inserted correctly. The user should now have access based on the granted `NEUROTESTER` status.
7.  **Invalidate Cache (Optional but Recommended):** If your system uses balance caching (like `getUserBalance.ts` does), manually invalidate the cache for this user if the operation *could* affect balance (though `NEUROTESTER` grant usually doesn't). This might involve calling a specific function or clearing a cache key if accessible.

**Example for user `1483886716` (using defaults, ADJUST AS NEEDED):**

```sql
INSERT INTO payments_v2 (telegram_id, bot_name, amount, stars, currency, status, type, payment_method, description, metadata, subscription_type, service_type, payment_date, inv_id)
VALUES ('1483886716', 'system_grant', 0, 0, 'SYSTEM', 'COMPLETED', 'BONUS', 'Manual', 'Grant NEUROTESTER subscription (Manual)', '{"granted_by": "Admin"}', 'NEUROTESTER', NULL, NOW(), EXTRACT(EPOCH FROM NOW())::bigint);
```

---

*Remember: With great power comes great responsibility. Use manual SQL modifications wisely.* 