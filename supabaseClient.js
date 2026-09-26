/**
 * Pathway Canada: Supabase Cloud Integration
 * Provides real authentication (OAuth + Email), Row-Level Security database sync,
 * and subscription state management.
 */

(function (window) {
    const STORAGE_KEY_URL = 'pathway_supabase_url';
    const STORAGE_KEY_ANON = 'pathway_supabase_anon_key';
    const STORAGE_KEY_STRIPE = 'pathway_stripe_payment_link';

    // Default CANEDU Supabase configuration
    const CANEDU_URL = 'https://wlnhygrpipvebyaxmvyp.supabase.co';
    const CANEDU_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsbmh5Z3JwaXB2ZWJ5YXhtdnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjU4NzMsImV4cCI6MjA4MTE0MTg3M30.fTvwgc0ljLfTw1Q_SDe6uFmn1BKdZal4C8c0djmnfdA';

    let supabaseUrl = localStorage.getItem(STORAGE_KEY_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || CANEDU_URL;
    let supabaseAnonKey = localStorage.getItem(STORAGE_KEY_ANON) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || CANEDU_ANON_KEY;

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

            const p = (provider || 'google').toLowerCase();

            // Pre-check if OAuth provider is enabled and has credentials in Supabase
            // to prevent stranding users on a raw 400 error page
            try {
                const checkUrl = `${supabaseUrl}/auth/v1/authorize?provider=${p}`;
                const resp = await fetch(checkUrl);
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    const msg = err.msg || err.error_description || 'OAuth provider credentials not configured';
                    console.warn(`Supabase ${provider} pre-check returned ${resp.status}:`, msg);
                    this.showOAuthUnavailableModal(provider, msg);
                    return;
                }
            } catch (e) {
                console.warn('OAuth pre-flight check bypassed:', e);
            }

            const redirectTo = window.location.origin + '/student-dashboard.html';
            const { data, error } = await client.auth.signInWithOAuth({
                provider: p,
                options: {
                    redirectTo: redirectTo
                }
            });

            if (error) {
                console.error('OAuth error:', error);
                this.showOAuthUnavailableModal(provider, error.message);
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
            document.getElementById('pathway-oauth-unavailable-modal')?.remove();
            let state = JSON.parse(localStorage.getItem('pathway_canada_state') || '{}');
            state.userName = state.userName || 'Student';
            state.authProvider = provider || 'Demo';
            localStorage.setItem('pathway_canada_state', JSON.stringify(state));
            window.location.href = 'student-dashboard.html';
        },

        showOAuthUnavailableModal: function (provider, detailMsg) {
            let existing = document.getElementById('pathway-oauth-unavailable-modal');
            if (existing) existing.remove();

            const pName = provider ? (provider.charAt(0).toUpperCase() + provider.slice(1)) : 'OAuth';
            const modalHtml = `
            <div id="pathway-oauth-unavailable-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn font-sans">
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
                    <button onclick="document.getElementById('pathway-oauth-unavailable-modal').remove()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
                    
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-2xl">key</span>
                        </div>
                        <div>
                            <h3 class="font-lexend font-bold text-lg text-slate-900 dark:text-white">${pName} OAuth Setup Required</h3>
                            <p class="text-xs text-slate-500">Supabase CANEDU is active, but Google OAuth credentials are pending</p>
                        </div>
                    </div>

                    <div class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 mb-5 leading-relaxed">
                        <strong>Supabase Status:</strong> 1-Click ${pName} sign-in requires an OAuth Client ID from Google Cloud Console. In the meantime, use your <strong>active Email Magic Link</strong> or fast demo mode below:
                    </div>

                    <!-- Instant Method 1: Magic Link (Working 100% Right Now) -->
                    <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 mb-4">
                        <label class="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Instant Magic Link Sign-In (Working Now)
                        </label>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                            Supabase will dispatch a secure 1-click login link directly to your inbox.
                        </p>
                        <div class="flex gap-2">
                            <input id="oauth-fallback-email" type="email" placeholder="you@domain.com" value="rleasa@gmail.com" class="flex-1 text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none">
                            <button id="btn-oauth-send-magic" class="bg-primary hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm">
                                Send Link
                            </button>
                        </div>
                        <div id="oauth-magic-status" class="text-[11px] mt-2 hidden"></div>
                    </div>

                    <!-- Instant Method 2: Fast Demo / Guest Login -->
                    <div class="flex items-center justify-between gap-3 pt-1 mb-4">
                        <div class="text-xs text-slate-500">Or continue instantly:</div>
                        <button onclick="PathwayAuth.continueAsGuest('${pName}')" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all">
                            Enter Dashboard as Admin / Guest →
                        </button>
                    </div>

                    <!-- Collapsible Admin Instructions -->
                    <details class="text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">
                        <summary class="cursor-pointer font-medium hover:text-slate-700 dark:hover:text-slate-300 select-none">
                            ⚙️ Administrator: How to enable 1-Click ${pName} OAuth
                        </summary>
                        <div class="mt-2 space-y-1.5 pl-3 text-slate-600 dark:text-slate-400">
                            <div>1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-primary underline">Google Cloud Console</a> &gt; Create OAuth Client ID (Web).</div>
                            <div>2. Set Authorized Redirect URI: <code class="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px] select-all">${supabaseUrl}/auth/v1/callback</code></div>
                            <div>3. Open Supabase: <a href="https://supabase.com/dashboard/project/wlnhygrpipvebyaxmvyp/auth/providers" target="_blank" class="text-primary underline font-medium">Auth Providers &gt; Google</a>.</div>
                            <div>4. Toggle Google ON, paste Client ID &amp; Secret, and save.</div>
                        </div>
                    </details>
                </div>
            </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const sendBtn = document.getElementById('btn-oauth-send-magic');
            if (sendBtn) {
                sendBtn.addEventListener('click', async () => {
                    const emailInput = document.getElementById('oauth-fallback-email');
                    const statusDiv = document.getElementById('oauth-magic-status');
                    const email = (emailInput.value || '').trim();

                    if (!email) {
                        statusDiv.textContent = 'Please enter your email.';
                        statusDiv.className = 'text-[11px] mt-2 text-rose-500 block';
                        return;
                    }

                    sendBtn.disabled = true;
                    sendBtn.textContent = 'Sending...';
                    statusDiv.className = 'text-[11px] mt-2 text-slate-500 block';
                    statusDiv.textContent = 'Dispatched request to Supabase...';

                    const ok = await PathwayAuth.signInWithMagicLink(email);
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Send Link';

                    if (ok) {
                        statusDiv.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Secure magic link sent to ${email}!</span> Check your inbox to sign in.`;
                        statusDiv.className = 'text-[11px] mt-2 block';
                    } else {
                        statusDiv.innerHTML = `<span class="text-rose-500 font-semibold">Failed to send link.</span> Please try demo mode or check configuration.`;
                        statusDiv.className = 'text-[11px] mt-2 block';
                    }
                });
            }
        }
    };

    window.PathwayAuth = PathwayAuth;

})(window);
