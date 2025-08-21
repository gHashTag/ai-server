# ai-server-express

ssh -i ~/.ssh/id_rsa root@cicd-a6yes-u14194.vm.elestio.app

## Common Testing Issues & Solutions

### 1. Error: `column users.id does not exist` during balance check

**Symptoms:**
- Logs show `❌ Ошибка при проверке пользователя:` with `error: column users.id does not exist`.
- This usually happens during operations that require checking the user balance, like model training.

**Cause:**
- The `getUserBalance` function in `src/core/supabase/getUserBalance.ts` attempts to select the `id` column from the `users` table to verify user existence.
- However, the `users` table might not have an `id` column accessible or named like that, or the primary key is `telegram_id` itself.

**Solution:**
- Modify the query in `src/core/supabase/getUserBalance.ts` to select `telegram_id` instead of `id`:

```typescript
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id') // Corrected: Select telegram_id
      .eq('telegram_id', telegram_id)
      .single()
```

### 2. Error: Incorrect balance calculation due to using old `payments` table

**Symptoms:**
- User balance might be calculated incorrectly or always return 0, even after successful payments recorded in `payments_v2`.
- Logs related to `getUserBalance` might not show errors, but the calculated balance is wrong.

**Cause:**
- The `getUserBalance` function in `src/core/supabase/getUserBalance.ts` was referencing the old `payments` table instead of the current `payments_v2` table.
- Additionally, the payment types used in the query (`'income'`, `'outcome'`) might not match the enums defined for `payments_v2` (`'money_income'`, `'money_expense'`).

**Solution:**
- Modify the queries in `src/core/supabase/getUserBalance.ts` to use the correct table name `payments_v2` and the corresponding `PaymentType` enum values:

```typescript
    // Fetch income records
    const { data: incomeData, error: incomeError } = await supabase
      .from('payments_v2') // Corrected: Use payments_v2
      .select('stars')
      .eq('telegram_id', telegram_id)
      .eq('type', 'money_income') // Corrected: Use PaymentType enum
      .eq('status', 'COMPLETED')

    // Fetch outcome records
    const { data: outcomeData, error: outcomeError } = await supabase
      .from('payments_v2') // Corrected: Use payments_v2
      .select('stars')
      .eq('telegram_id', telegram_id)
      .eq('type', 'money_expense') // Corrected: Use PaymentType enum
      .eq('status', 'COMPLETED')
```

### 3. Error: `Не удалось рассчитать баланс пользователя` during expense operation

**Symptoms:**
- Logs show `Error: Не удалось рассчитать баланс пользователя` originating from `getUserBalance`.
- The application might crash if the error is not handled properly by the calling function.

**Cause:**
- The `getUserBalance` function calls the Supabase RPC function `get_user_balance`.
- An error occurred during the RPC call (e.g., database issue, incorrect `telegram_id` format passed to the function, or an error within the SQL function itself).
- The calling function (e.g., `processBalanceVideoOperation`) did not properly catch or handle the error thrown by `getUserBalance`, leading to an unhandled exception.

**Solution:**
1.  **Ensure Correct `telegram_id`:** Verify that the `telegram_id` being passed to `getUserBalance` is correctly normalized to a string using `normalizeTelegramId` before the RPC call.
2.  **Handle Errors Gracefully:** Modify the calling function (e.g., in `src/price/helpers/processBalanceVideoOperation.ts`) to wrap the `getUserBalance` call in a `try...catch` block. In the `catch` block, log the error and return a failure result (e.g., `{ success: false, error: 'Balance check failed' }`) instead of re-throwing the error.
    ```typescript
    // Example in processBalanceVideoOperation.ts
    try {
      const currentBalance = await getUserBalance(telegram_id);
      // ... rest of the logic ...
    } catch (error) {
      logger.error('❌ Ошибка при проверке баланса:', { error, telegram_id });
      return {
        newBalance: 0, 
        paymentAmount: 0,
        success: false,
        error: is_ru ? 'Ошибка проверки баланса' : 'Error checking balance',
        modePrice: 0,
      };
    }
    ```
3.  **Investigate SQL Function:** If the error persists, investigate the `get_user_balance` SQL function in Supabase for potential issues.

### 4. Error: `TelegramError: 401: Unauthorized` when sending messages

**Symptoms:**
- The application crashes with a `TelegramError: 401: Unauthorized`.
- Logs indicate the error occurs when the bot tries to call a Telegram API method like `sendMessage`.

**Cause:**
- The Telegram Bot Token provided to the Telegraf instance (likely via environment variables like `TELEGRAM_BOT_TOKEN_AI_KOSHEY_BOT`) is invalid, revoked, or incorrect.

**Solution:**
1.  **Verify Token:** Double-check the Telegram Bot Token in your environment configuration (e.g., `.env` file).
2.  **Generate New Token:** If necessary, generate a new token from BotFather on Telegram and update your configuration.
3.  **Restart Application:** Ensure the application is restarted after updating the token for the changes to take effect.
