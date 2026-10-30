// MindCare AI — Authentication & Registration Handler

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('signup-submit') || signupForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Creating Account…';
        submitBtn.disabled = true;
      }

      const payload = {
        displayName: document.getElementById('displayName').value.trim(),
        email: document.getElementById('email').value.trim(),
        state: document.getElementById('state').value,
        password: document.getElementById('password').value,
        consents: {
          journaling: document.getElementById('c-journaling')?.checked ?? true,
          screening_tools: document.getElementById('c-screening')?.checked ?? true,
          research_library: document.getElementById('c-research')?.checked ?? true,
          doctor_directory_gps: document.getElementById('c-gps')?.checked ?? true,
          record_upload: document.getElementById('c-records')?.checked ?? true
        }
      };

      try {
        const data = await apiFetch('/auth/signup', { method: 'POST', body: payload, auth: false });
        Auth.setSession(data.token, data.user);
        toast('Account created successfully!');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      } catch (err) {
        toast(err.message);
        if (submitBtn) {
          submitBtn.textContent = 'Create Account & Proceed';
          submitBtn.disabled = false;
        }
      }
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('login-submit') || loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Signing in…';
        submitBtn.disabled = true;
      }

      const payload = {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      };

      try {
        const data = await apiFetch('/auth/login', { method: 'POST', body: payload, auth: false });
        Auth.setSession(data.token, data.user);
        toast('Signed in successfully.');
        const next = new URLSearchParams(window.location.search).get('next');
        setTimeout(() => {
          window.location.href = next || 'dashboard.html';
        }, 500);
      } catch (err) {
        toast(err.message);
        if (submitBtn) {
          submitBtn.textContent = 'Sign In to Portal';
          submitBtn.disabled = false;
        }
      }
    });
  }
});
