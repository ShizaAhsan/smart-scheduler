// ANNOUNCEMENT MANAGEMENT
function openNewAnnouncement() {
    document.getElementById('newAnnForm').style.display = 'block';
}

function closeNewAnnouncement() {
    document.getElementById('newAnnForm').style.display = 'none';
}

function publishAnnouncement() {
    alert("✅ Announcement published!\nAll users have been notified.");
    closeNewAnnouncement();
}

function editAnn(id) {
    alert("✏️ Edit announcement #" + id);
}

function deleteAnn(id) {
    if (confirm("Delete this announcement?")) {
        alert("🗑️ Announcement deleted!");
    }
}