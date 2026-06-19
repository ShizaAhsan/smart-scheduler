console.log("Campus Smart Scheduler loaded!");

// Handle real backend authentication
function handleLogin() {
    const email = document.querySelector('input[type="text"]').value;
    const password = document.querySelector('input[type="password"]').value;
    
    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    fetch('api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, password: password })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || "Login failed"); });
        }
        return response.json();
    })
    .then(user => {
        // Store session info
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Redirect according to role
        if (user.role === 'student') {
            window.location.href = "student/dashboard.html";
        } else if (user.role === 'teacher') {
            window.location.href = "teacher/dashboard.html";
        } else if (user.role === 'admin') {
            window.location.href = "admin/dashboard.html";
        } else {
            alert("Role not recognized!");
        }
    })
    .catch(error => {
        alert("❌ Login Error: " + error.message);
    });
}

// Dynamically load the AI Assistant Widget
document.addEventListener('DOMContentLoaded', () => {
    const aiScript = document.createElement('script');
    aiScript.src = 'js/ai-assistant.js';
    document.body.appendChild(aiScript);
});