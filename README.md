# ai-server-express

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
