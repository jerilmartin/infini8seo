@echo off
echo.
echo ========================================
echo Testing Supabase Connection
echo ========================================
echo.

node -e "import('@supabase/supabase-js').then(async ({createClient}) => { const dotenv = await import('dotenv'); dotenv.config(); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY); const {data, error} = await supabase.from('jobs').select('count').limit(1); if (error) { if (error.code === 'PGRST205') { console.log(''); console.log('❌ DATABASE TABLES NOT FOUND!'); console.log(''); console.log('You need to create the tables:'); console.log(''); console.log('1. Go to: https://supabase.com/dashboard'); console.log('2. Open your project'); console.log('3. Click SQL Editor'); console.log('4. Click New Query'); console.log('5. Copy contents of config\\schema.sql'); console.log('6. Paste and click RUN'); console.log(''); console.log('Then run this script again to test.'); console.log(''); } else if (error.code === 'PGRST116') { console.log('✅ Connection successful! Tables exist (no data yet).'); } else { console.log('❌ Error:', error.message); } } else { console.log('✅ Connection successful! Tables exist and have data.'); } }).catch(e => console.error('Error:', e))"

echo.
pause

