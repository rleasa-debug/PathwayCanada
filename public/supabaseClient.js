/**
 * Pathway Canada: Supabase Cloud Integration
 * Provides real authentication (OAuth + Email), Row-Level Security database sync,
 * and subscription state management.
 */

(function (window) {
    const STORAGE_KEY_URL = 'pathway_supabase_url';
    const STORAGE_KEY_ANON = 'pathway_supabase_anon_key';
    const STORAGE_KEY_STRIPE = 'pathway_stripe_payment_link';

    // Default configuration (can be updated via UI settings modal or environment)
    let supabaseUrl = localStorage.getItem(STORAGE_KEY_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '';
    let supabaseAnonKey = localStorage.getItem(STORAGE_KEY_ANON) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || '';

    // Default Stripe Payment Link ($29 Pathway Canada Pro)
    let stripePaymentLink = localStorage.getItem(STORAGE_KEY_STRIPE) || 'https://buy.stripe.com/test_pathway_canada_pro';

    let client = null;

    function initClient() {
        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-canadian-project-id')) {
                try {
                    client = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true
                        }
                    });
                    console.log('✓ Supabase Client successfully initialized');
                } catch (e) {
                    console.error('Failed to initialize Supabase client:', e);
                    client = null;
                }
            }
        }
    }

    // Auto-init when script loads
    initClient();

    const PathwayAuth = {
        isConfigured: function () {
            return client !== null;
        },

        getConfig: function () {
            return {
                supabaseUrl: supabaseUrl,
                supabaseAnonKey: supabaseAnonKey ? '••••••••' + supabaseAnonKey.slice(-6) : '',
                stripePaymentLink: stripePaymentLink
            };
        },

        setConfig: function (url, anonKey, paymentLink) {
            if (url) {
                supabaseUrl = url.trim();
                localStorage.setItem(STORAGE_KEY_URL, supabaseUrl);
            }
            if (anonKey) {
                supabaseAnonKey = anonKey.trim();
                localStorage.setItem(STORAGE_KEY_ANON, supabaseAnonKey);
            }
            if (paymentLink) {
                stripePaymentLink = paymentLink.trim();
                localStorage.setItem(STORAGE_KEY_STRIPE, stripePaymentLink);
            }
            initClient();
            return this.isConfigured();
        },

        getClient: function () {
            return client;
        },

        getStripePaymentLink: function () {
            return stripePaymentLink;
        },

        // Trigger real OAuth sign in (Google, Apple, etc.)
        signInWithOAuth: async function (provider) {
            if (!this.isConfigured()) {
                this.showConfigModal(provider);
                return;
            }

            const redirectTo = window.location.origin + '/student-dashboard.html';
            const { data, error } = await client.auth.signInWithOAuth({
                provider: provider.toLowerCase(),
                options: {
                    redirectTo: redirectTo
                }
            });

            if (error) {
                alert(`Authentication error with ${provider}: ` + error.message);
                console.error('OAuth error:', error);
            }
        },

        // Sign in with email and password
        signInWithPassword: async function (email, password) {
            if (!this.isConfigured()) {
                this.showConfigModal('email');
                return null;
            }
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) {
                alert('Sign In Error: ' + error.message);
                return null;
            }
            this.handleAuthSuccess(data.user);
            return data;
        },

        // Sign up with email and password
        signUpWithPassword: async function (email, password, fullName) {
            if (!this.isConfigured()) {
                this.showConfigModal('email');
                return null;
            }
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });
            if (error) {
                alert('Sign Up Error: ' + error.message);
                return null;
            }
            alert('Sign up successful! Please check your email inbox to confirm your account.');
            return data;
        },

        // Passwordless Magic Link Sign In
        signInWithMagicLink: async function (email) {
            if (!this.isConfigured()) {
                this.showConfigModal('email');
                return false;
            }
            const { error } = await client.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin + '/student-dashboard.html'
                }
            });
            if (error) {
                alert('Magic Link Error: ' + error.message);
                return false;
            }
            alert('A secure sign-in magic link has been sent to ' + email);
            return true;
        },

        // Sign Out
        signOut: async function () {
            if (client) {
                await client.auth.signOut();
            }
            localStorage.removeItem('pathway_canada_state');
            window.location.href = '/index.html';
        },

        // Get current authenticated user
        getCurrentUser: async function () {
            if (!this.isConfigured()) return null;
            const { data: { user } } = await client.auth.getUser();
            return user;
        },

        // Sync student academic records to Supabase Cloud Database
        syncRecordsToCloud: async function (state) {
            if (!this.isConfigured()) return false;
            const user = await this.getCurrentUser();
            if (!user) return false;

            try {
                const { error } = await client
                    .from('student_records')
                    .upsert({
                        user_id: user.id,
                        courses: state.courses || [],
                        calculated_average: state.targetAverage || null,
                        saved_programs: state.savedPrograms || [],
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                if (error) {
                    console.warn('Could not sync to student_records table:', error.message);
                    return false;
                }
                return true;
            } catch (err) {
                console.warn('Error during cloud record sync:', err);
                return false;
            }
        },

        // Load student academic records from Supabase Cloud Database
        loadRecordsFromCloud: async function () {
            if (!this.isConfigured()) return null;
            const user = await this.getCurrentUser();
            if (!user) return null;

            try {
                const { data, error } = await client
                    .from('student_records')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.warn('Failed to load student_records:', error.message);
                    return null;
                }
                return data;
            } catch (err) {
                return null;
            }
        },

        // Helpers to read/write state compatible with shared.js
        getLocalState: function () {
            const raw = localStorage.getItem('pathway_canada_state');
            if (!raw) return {};
            if (typeof window.decryptState === 'function') {
                const dec = window.decryptState(raw);
                if (dec) return dec;
            }
            try {
                return JSON.parse(raw);
            } catch (e) {
                return {};
            }
        },

        saveLocalState: function (state) {
            if (typeof window.encryptState === 'function') {
                localStorage.setItem('pathway_canada_state', window.encryptState(state));
            } else {
                localStorage.setItem('pathway_canada_state', JSON.stringify(state));
            }
            window.dispatchEvent(new Event('storage'));
        },

        // Trigger Stripe Checkout
        startStripeCheckout: function () {
            const link = this.getStripePaymentLink();
            if (link && !link.includes('placeholder') && !link.includes('test_pathway_canada_pro')) {
                window.open(link, '_blank');
            } else {
                // If payment link is default or test, ask user whether to open config modal or simulate immediate activation
                const proceed = confirm("Pathway Canada Pro Checkout ($29.00 CAD)\n\n• Click OK to simulate instant Pro account activation.\n• Click Cancel to enter your custom live Stripe Payment Link.");
                if (proceed) {
                    this.upgradeUserToPro();
                } else {
                    this.showConfigModal('stripe');
                }
            }
        },

        // Update Pro Subscription Status
        upgradeUserToPro: async function () {
            let state = this.getLocalState();
            state.isPro = true;
            this.saveLocalState(state);

            if (this.isConfigured()) {
                const user = await this.getCurrentUser();
                if (user) {
                    await client.from('profiles').update({ is_pro: true }).eq('id', user.id);
                }
            }

            sessionStorage.setItem('just_upgraded', 'true');
            if (typeof window.renderDashboard === 'function') window.renderDashboard();
            alert('🎉 Congratulations! Pathway Canada Pro has been unlocked for your account.');
            window.location.reload();
        },

        // Handle successful local session from user
        handleAuthSuccess: function (user) {
            let state = this.getLocalState();
            state.userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
            state.userEmail = user.email || '';
            state.userPicture = user.user_metadata?.avatar_url || '';
            state.authProvider = user.app_metadata?.provider || 'Supabase';
            this.saveLocalState(state);
            window.location.href = 'student-dashboard.html';
        },

        // UI Modal to connect Supabase / Stripe anytime
        showConfigModal: function (context) {
            let existing = document.getElementById('pathway-cloud-config-modal');
            if (existing) existing.remove();

            const modalHtml = `
            <div id="pathway-cloud-config-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
                    <button onclick="document.getElementById('pathway-cloud-config-modal').remove()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
                    
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <span class="material-symbols-outlined">database</span>
                        </div>
                        <div>
                            <h3 class="font-lexend font-bold text-lg text-slate-900 dark:text-white">Cloud Backend & Payments</h3>
                            <p class="text-xs text-slate-500">Connect your Supabase Database and Stripe Payment Link</p>
                        </div>
                    </div>

                    <div class="space-y-4 text-left">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Supabase Project URL</label>
                            <input id="cfg-supabase-url" type="text" placeholder="https://xyzcompany.supabase.co" value="${supabaseUrl}" class="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Supabase Anon Public API Key</label>
                            <input id="cfg-supabase-key" type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="${supabaseAnonKey}" class="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Stripe Payment Link (Pro Upgrade)</label>
                            <input id="cfg-stripe-link" type="text" placeholder="https://buy.stripe.com/..." value="${stripePaymentLink}" class="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                        </div>

                        <div class="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                            💡 <strong>Tip:</strong> Paste your free Supabase credentials to enable real OAuth logins (Google, Apple, Facebook) and cloud data persistence. Your schema file is ready at <code class="font-mono">supabase_schema.sql</code>.
                        </div>

                        <div class="flex gap-3 pt-2">
                            <button id="btn-save-cloud-config" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-md">
                                Save & Connect
                            </button>
                            <button onclick="PathwayAuth.continueAsGuest('${context}')" class="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl">
                                Continue as Demo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('btn-save-cloud-config').addEventListener('click', () => {
                const url = document.getElementById('cfg-supabase-url').value;
                const key = document.getElementById('cfg-supabase-key').value;
                const stripe = document.getElementById('cfg-stripe-link').value;

                PathwayAuth.setConfig(url, key, stripe);
                document.getElementById('pathway-cloud-config-modal').remove();

                if (PathwayAuth.isConfigured()) {
                    alert('✓ Connected to Supabase Cloud! You can now sign in with OAuth or Email.');
                    if (context && context !== 'email') {
                        PathwayAuth.signInWithOAuth(context);
                    }
                } else {
                    alert('Configuration saved.');
                }
            });
        },

        continueAsGuest: function (provider) {
            document.getElementById('pathway-cloud-config-modal')?.remove();
            let state = JSON.parse(localStorage.getItem('pathway_canada_state') || '{}');
            state.userName = state.userName || 'Student';
            state.authProvider = provider || 'Demo';
            localStorage.setItem('pathway_canada_state', JSON.stringify(state));
            window.location.href = 'student-dashboard.html';
        }
    };

    window.PathwayAuth = PathwayAuth;

})(window);
