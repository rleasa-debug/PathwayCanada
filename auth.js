
(function() {
// Supabase Client Initialization (replace with your actual Supabase URL and Anon Key)
const SUPABASE_URL = typeof process !== 'undefined' && process.env?.SUPABASE_URL ? process.env.SUPABASE_URL : 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY : 'YOUR_SUPABASE_ANON_KEY';
const legacySupabase = (typeof Supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
    ? Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

async function signUp(email, password) {
    if (!supabase) {
        console.warn('Supabase auth is not configured.');
        return null;
    }
    const { user, session, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });
    if (error) {
        alert('Sign Up Error: ' + error.message);
        return null;
    }
    alert('Sign Up Successful! Please check your email for a confirmation link.');
    return { user, session };
}

async function signIn(email, password) {
    if (!supabase) {
        console.warn('Supabase auth is not configured.');
        return null;
    }
    const { user, session, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) {
        alert('Sign In Error: ' + error.message);
        return null;
    }
    alert('Sign In Successful!');
    return { user, session };
}

async function signOut() {
    if (!supabase) {
        console.warn('Supabase auth is not configured.');
        return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert('Sign Out Error: ' + error.message);
        return;
    }
    alert('Signed Out Successfully!');
    window.location.href = '/'; // Redirect to home or login page
}

// Example usage (replace with your actual form/button handling)
document.addEventListener('DOMContentLoaded', () => {
    const signUpForm = document.getElementById('signup-form');
    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = signUpForm.email.value;
            const password = signUpForm.password.value;
            await signUp(email, password);
        });
    }

    const signInForm = document.getElementById('signin-form');
    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = signInForm.email.value;
            const password = signInForm.password.value;
            await signIn(email, password);
        });
    }

    const signOutButton = document.getElementById('signout-button');
    if (signOutButton) {
        signOutButton.addEventListener('click', signOut);
    }
});

// Helper to get current session
async function getSession() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

// Helper to get current user
async function getUser() {
    if (!legacySupabase) return null;
    const { data: { user } } = await legacySupabase.auth.getUser();
    return user;
}
})();
