import os
import sqlite3
import json
import random
import urllib.request
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scheduler.db')
DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
SLOTS = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM']
LUNCH_SLOT = '01:00 PM'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        semester TEXT NOT NULL,
        credits INTEGER NOT NULL DEFAULT 3,
        department TEXT NOT NULL DEFAULT 'Computer Science',
        type TEXT NOT NULL DEFAULT 'Lecture', -- 'Lecture' or 'Lab'
        student_count INTEGER NOT NULL DEFAULT 35,
        teacher_id INTEGER,
        FOREIGN KEY (teacher_id) REFERENCES users(id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_num TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Classroom', -- 'Classroom', 'Lab', 'Auditorium'
        capacity INTEGER NOT NULL DEFAULT 40
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS teacher_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER UNIQUE NOT NULL,
        availability TEXT NOT NULL, -- JSON string
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS timetable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        teacher_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        semester TEXT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        role_target TEXT NOT NULL DEFAULT 'all'
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'Reschedule', 'Quiz', 'Extra Class'
        title TEXT NOT NULL,
        details TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS generation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        semester TEXT NOT NULL,
        status TEXT NOT NULL,
        conflicts_count INTEGER NOT NULL DEFAULT 0,
        conflicts_details TEXT DEFAULT '[]'
    )
    ''')
    
    conn.commit()

    # Seed initial data if users table is empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        # Seed users (Admin, Teachers, Students)
        users = [
            # Admin
            ('admin@css.com', 'admin123', 'Admin Office', 'admin'),
            # Teachers
            ('farhan@university.edu.pk', 'teacher123', 'Sir Farhan Ahmed', 'teacher'),
            ('ali@university.edu.pk', 'teacher123', 'Sir Ali Hassan', 'teacher'),
            ('hamza@university.edu.pk', 'teacher123', 'Sir Hamza Khan', 'teacher'),
            ('ahmed@university.edu.pk', 'teacher123', 'Sir Ahmed Malik', 'teacher'),
            ('usman@university.edu.pk', 'teacher123', 'Sir Usman Ghani', 'teacher'),
            # Students
            ('ali@student.edu.pk', 'student123', 'Ali Raza', 'student'),
            ('sara@student.edu.pk', 'student123', 'Sara Ahmed', 'student'),
            ('hamza_s@student.edu.pk', 'student123', 'Hamza Khan', 'student'),
            ('fatima@student.edu.pk', 'student123', 'Fatima Malik', 'student'),
            # Demo direct logins matching previous app.js values
            ('admin@css.com', 'admin123', 'Admin Panel', 'admin'),
            ('teacher@css.com', 'teacher123', 'Sir Farhan Ahmed', 'teacher'),
            ('student@css.com', 'student123', 'Ali Raza', 'student')
        ]
        # Avoid duplicate admin@css.com
        unique_users = []
        seen_emails = set()
        for email, pwd, name, role in users:
            if email not in seen_emails:
                unique_users.append((email, pwd, name, role))
                seen_emails.add(email)
                
        cursor.executemany("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)", unique_users)
        conn.commit()
        
        # Get IDs of seeded teachers
        cursor.execute("SELECT id, name FROM users WHERE role = 'teacher'")
        teacher_map = {row['name']: row['id'] for row in cursor.fetchall()}
        
        # Seed rooms
        rooms = [
            ('CS-301', 'Classroom 1', 'Classroom', 40),
            ('CS-302', 'Classroom 2', 'Classroom', 50),
            ('CS Lab 1', 'Computer Lab 1', 'Lab', 30),
            ('CS Lab 2', 'Computer Lab 2', 'Lab', 35),
            ('Seminar', 'Seminar Hall', 'Auditorium', 100)
        ]
        cursor.executemany("INSERT INTO rooms (room_num, name, type, capacity) VALUES (?, ?, ?, ?)", rooms)
        conn.commit()

        # Seed courses
        courses = [
            ('CS-201', 'Data Structures', '3rd Semester', 3, 'Computer Science', 'Lecture', 35, teacher_map.get('Sir Farhan Ahmed')),
            ('CS-201L', 'Data Structures Lab', '3rd Semester', 1, 'Computer Science', 'Lab', 30, teacher_map.get('Sir Farhan Ahmed')),
            ('CS-202', 'Database Systems', '3rd Semester', 3, 'Computer Science', 'Lecture', 33, teacher_map.get('Sir Ali Hassan')),
            ('CS-202L', 'Database Systems Lab', '3rd Semester', 1, 'Computer Science', 'Lab', 30, teacher_map.get('Sir Ali Hassan')),
            ('CS-203', 'Web Engineering', '3rd Semester', 3, 'Computer Science', 'Lecture', 40, teacher_map.get('Sir Hamza Khan')),
            ('CS-203L', 'Web Engineering Lab', '3rd Semester', 1, 'Computer Science', 'Lab', 30, teacher_map.get('Sir Hamza Khan')),
            ('CS-303', 'Operating Systems', '4th Semester', 3, 'Computer Science', 'Lecture', 32, teacher_map.get('Sir Ahmed Malik')),
            ('SE-301', 'Software Engineering', '4th Semester', 3, 'Software Engineering', 'Lecture', 28, teacher_map.get('Sir Usman Ghani'))
        ]
        cursor.executemany("INSERT INTO courses (code, name, semester, credits, department, type, student_count, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", courses)
        conn.commit()

        # Seed teacher availability (All slots checked by default, except Saturday and Lunch hour)
        default_avail = {day: [slot for slot in SLOTS if slot != LUNCH_SLOT] for day in DAYS}
        default_avail['Saturday'] = [] # weekend off by default
        
        for t_name, t_id in teacher_map.items():
            # Customize slightly to demonstrate availability limits
            avail = json.loads(json.dumps(default_avail))
            if t_name == 'Sir Usman Ghani':
                # Sir Usman is unavailable on Monday
                avail['Monday'] = []
            elif t_name == 'Sir Ahmed Malik':
                # Sir Ahmed only available in morning
                avail['Wednesday'] = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM']
            cursor.execute("INSERT INTO teacher_availability (teacher_id, availability) VALUES (?, ?)", (t_id, json.dumps(avail)))
        conn.commit()

        # Seed some announcements
        announcements = [
            ('Midterm Schedule Out', 'Midterm examination will start from June 10, 2026. Please check your portals.', '2026-06-01', 'all'),
            ('Rescheduling Notice', 'Web Engineering Lab scheduled for Wednesday has been moved to Thursday.', '2026-06-15', 'student'),
            ('Faculty Meeting', 'Urgent curriculum revision meeting on Friday 3:00 PM at Seminar Hall.', '2026-06-17', 'teacher')
        ]
        cursor.executemany("INSERT INTO announcements (title, content, date, role_target) VALUES (?, ?, ?, ?)", announcements)
        conn.commit()

        # Seed a request
        cursor.execute("SELECT id FROM users WHERE email = 'teacher@css.com'")
        teacher_id = cursor.fetchone()[0]
        cursor.execute("INSERT INTO requests (teacher_id, type, title, details, status) VALUES (?, ?, ?, ?, ?)", 
                       (teacher_id, 'Reschedule', 'Class Reschedule', 'Sir Ali — CS-202 — 25 May, 2:00 PM', 'Pending'))
        cursor.execute("INSERT INTO requests (teacher_id, type, title, details, status) VALUES (?, ?, ?, ?, ?)", 
                       (teacher_id, 'Quiz', 'Data Structures Quiz', 'Sir Farhan — CS-201 — 22 May, 9:00 AM', 'Pending'))
        conn.commit()

        # Seed initial conflict-free timetable
        # Get rooms & courses
        cursor.execute("SELECT id, room_num FROM rooms")
        room_ids = {row['room_num']: row['id'] for row in cursor.fetchall()}
        
        cursor.execute("SELECT id, code, teacher_id, semester FROM courses")
        course_ids = {row['code']: (row['id'], row['teacher_id'], row['semester']) for row in cursor.fetchall()}
        
        # Add a few starter entries
        timetable_entries = [
            (course_ids['CS-201'][0], room_ids['CS-301'], course_ids['CS-201'][1], 'Monday', '09:00 AM', course_ids['CS-201'][2]),
            (course_ids['CS-202'][0], room_ids['CS-302'], course_ids['CS-202'][1], 'Monday', '11:00 AM', course_ids['CS-202'][2]),
            (course_ids['CS-203L'][0], room_ids['CS Lab 1'], course_ids['CS-203L'][1], 'Monday', '02:00 PM', course_ids['CS-203L'][2])
        ]
        cursor.executemany("INSERT INTO timetable (course_id, room_id, teacher_id, day, time_slot, semester) VALUES (?, ?, ?, ?, ?, ?)", timetable_entries)
        conn.commit()

        # Save successful history entry
        cursor.execute("INSERT INTO generation_history (date, semester, status, conflicts_count, conflicts_details) VALUES (?, ?, ?, ?, ?)",
                       (datetime.now().strftime('%Y-%m-%d'), 'Spring 2024', 'Success', 0, '[]'))
        conn.commit()
        
    conn.close()

# Initialize DB on import
init_db()

# --- HELPER: Conflict Detector ---
def run_conflict_check():
    conn = get_db()
    cursor = conn.cursor()
    
    # Load all timetable entries with info
    cursor.execute('''
        SELECT t.id, t.day, t.time_slot, t.semester,
               c.name as course_name, c.type as course_type, c.student_count,
               r.room_num, r.type as room_type, r.capacity,
               u.name as teacher_name, u.id as teacher_id
        FROM timetable t
        JOIN courses c ON t.course_id = c.id
        JOIN rooms r ON t.room_id = r.id
        JOIN users u ON t.teacher_id = u.id
    ''')
    entries = [dict(row) for row in cursor.fetchall()]
    
    # Load teacher availabilities
    cursor.execute("SELECT teacher_id, availability FROM teacher_availability")
    availabilities = {row['teacher_id']: json.loads(row['availability']) for row in cursor.fetchall()}
    conn.close()
    
    conflicts = []
    
    # 1. Check collisions (Teacher, Room, Semester overlap)
    for i in range(len(entries)):
        e1 = entries[i]
        
        # Lab course in classroom
        if e1['course_type'] == 'Lab' and e1['room_type'] != 'Lab':
            conflicts.append({
                'type': 'Lab Course in Lecture Room',
                'details': f"Lab course '{e1['course_name']}' is scheduled in room '{e1['room_num']}' which is type '{e1['room_type']}'.",
                'severity': 'Critical',
                'entry_id': e1['id']
            })
            
        # Room Capacity Exceeded
        if e1['student_count'] > e1['capacity']:
            conflicts.append({
                'type': 'Room Capacity Warning',
                'details': f"Room '{e1['room_num']}' has capacity {e1['capacity']} but course '{e1['course_name']}' has {e1['student_count']} students enrolled.",
                'severity': 'Warning',
                'entry_id': e1['id']
            })
            
        # Lunch hour checking
        if e1['time_slot'] == LUNCH_SLOT:
            conflicts.append({
                'type': 'Lunch Break Conflict',
                'details': f"Course '{e1['course_name']}' is scheduled during the blocked Lunch Break slot ({LUNCH_SLOT}) on {e1['day']}.",
                'severity': 'Critical',
                'entry_id': e1['id']
            })
            
        # Teacher Availability checking
        t_id = e1['teacher_id']
        t_avail = availabilities.get(t_id, {})
        day_avail = t_avail.get(e1['day'], [])
        if e1['time_slot'] not in day_avail:
            conflicts.append({
                'type': 'Teacher Unavailable',
                'details': f"{e1['teacher_name']} is scheduled for '{e1['course_name']}' on {e1['day']} at {e1['time_slot']}, which is outside their availability.",
                'severity': 'Warning',
                'entry_id': e1['id']
            })
            
        for j in range(i + 1, len(entries)):
            e2 = entries[j]
            
            # Same day & time slot
            if e1['day'] == e2['day'] and e1['time_slot'] == e2['time_slot']:
                # Teacher conflict
                if e1['teacher_id'] == e2['teacher_id']:
                    conflicts.append({
                        'type': 'Teacher Conflict',
                        'details': f"{e1['teacher_name']} is assigned to two classes at the same time: '{e1['course_name']}' and '{e2['course_name']}' on {e1['day']} at {e1['time_slot']}.",
                        'severity': 'Critical',
                        'entry_ids': [e1['id'], e2['id']]
                    })
                # Room conflict
                if e1['room_num'] == e2['room_num']:
                    conflicts.append({
                        'type': 'Room Double Booking',
                        'details': f"Room '{e1['room_num']}' is assigned to two classes at the same time: '{e1['course_name']}' and '{e2['course_name']}' on {e1['day']} at {e1['time_slot']}.",
                        'severity': 'Critical',
                        'entry_ids': [e1['id'], e2['id']]
                    })
                # Semester / cohort conflict
                if e1['semester'] == e2['semester']:
                    conflicts.append({
                        'type': 'Student Overlap',
                        'details': f"Students in cohort '{e1['semester']}' have overlapping classes: '{e1['course_name']}' and '{e2['course_name']}' on {e1['day']} at {e1['time_slot']}.",
                        'severity': 'Critical',
                        'entry_ids': [e1['id'], e2['id']]
                    })
                    
    return conflicts

# --- SCHEDULING ENGINES ---
def generate_schedule_backtracking(semester, courses, rooms, availabilities, pre_assignments=None):
    if pre_assignments is None:
        pre_assignments = []
    
    # Sort courses so that labs are scheduled first (most constrained variable heuristic)
    courses_sorted = sorted(courses, key=lambda c: 0 if c['type'] == 'Lab' else 1)
    
    # Helper to check conflicts dynamically
    def is_consistent(course, day, slot, room, current_assignments):
        # 1. Lunch Break Constraint
        if slot == LUNCH_SLOT:
            return False
            
        # 2. Lab placement Constraint
        if course['type'] == 'Lab' and room['type'] != 'Lab':
            return False
            
        # 3. Teacher Availability
        t_id = course['teacher_id']
        t_avail = availabilities.get(t_id, {})
        day_slots = t_avail.get(day, [])
        if slot not in day_slots:
            return False
            
        # 4. Check collisions in current assignments
        for ass in current_assignments:
            if ass['day'] == day and ass['time_slot'] == slot:
                # Room collision
                if ass['room_id'] == room['id']:
                    return False
                # Teacher collision
                if ass['teacher_id'] == course['teacher_id']:
                    return False
                # Student Cohort collision
                if ass['semester'] == course['semester']:
                    return False
                    
        return True

    def backtrack(index, current_assignments):
        if index == len(courses_sorted):
            return current_assignments
            
        course = courses_sorted[index]
        
        # Prioritize even distribution: randomize or order slots/days to disperse classes
        shuffled_days = list(DAYS)
        random.shuffle(shuffled_days)
        
        ordered_slots = [s for s in SLOTS if s != LUNCH_SLOT]
        
        for day in shuffled_days:
            for slot in ordered_slots:
                # Get suitable rooms
                suitable_rooms = [r for r in rooms if (course['type'] == 'Lab' and r['type'] == 'Lab') or (course['type'] != 'Lab' and r['type'] != 'Lab')]
                random.shuffle(suitable_rooms)
                
                for room in suitable_rooms:
                    if is_consistent(course, day, slot, room, current_assignments):
                        new_assignment = {
                            'course_id': course['id'],
                            'room_id': room['id'],
                            'teacher_id': course['teacher_id'],
                            'day': day,
                            'time_slot': slot,
                            'semester': course['semester']
                        }
                        
                        result = backtrack(index + 1, current_assignments + [new_assignment])
                        if result is not None:
                            return result
                            
        return None
        
    return backtrack(0, pre_assignments)

def generate_schedule_greedy(semester, courses, rooms, availabilities, pre_assignments=None):
    if pre_assignments is None:
        pre_assignments = []
    # Greedy Solver: assigns first available slot with fewer constraints checked, or logs issues
    assignments = list(pre_assignments)
    
    # Sort courses randomly
    random.shuffle(courses)
    
    for course in courses:
        placed = False
        # Get valid rooms
        valid_rooms = [r for r in rooms if (course['type'] == 'Lab' and r['type'] == 'Lab') or (course['type'] != 'Lab' and r['type'] != 'Lab')]
        if not valid_rooms:
            valid_rooms = rooms # Fallback
            
        for day in DAYS:
            if placed: break
            for slot in SLOTS:
                if slot == LUNCH_SLOT: continue
                if placed: break
                
                # Check teacher availability
                t_id = course['teacher_id']
                t_avail = availabilities.get(t_id, {})
                if slot not in t_avail.get(day, []):
                    continue
                    
                for room in valid_rooms:
                    # Check for room, teacher, semester double booking
                    collision = False
                    for ass in assignments:
                        if ass['day'] == day and ass['time_slot'] == slot:
                            if ass['room_id'] == room['id'] or ass['teacher_id'] == course['teacher_id'] or ass['semester'] == course['semester']:
                                collision = True
                                break
                    if not collision:
                        assignments.append({
                            'course_id': course['id'],
                            'room_id': room['id'],
                            'teacher_id': course['teacher_id'],
                            'day': day,
                            'time_slot': slot,
                            'semester': course['semester']
                        })
                        placed = True
                        break
                        
        # If greedy solver couldn't find a conflict-free slot, force place it (to show greedy limitations)
        if not placed:
            forced_day = random.choice(DAYS)
            forced_slot = random.choice([s for s in SLOTS if s != LUNCH_SLOT])
            forced_room = random.choice(valid_rooms) if valid_rooms else rooms[0]
            assignments.append({
                'course_id': course['id'],
                'room_id': forced_room['id'],
                'teacher_id': course['teacher_id'],
                'day': forced_day,
                'time_slot': forced_slot,
                'semester': course['semester']
            })
            
    return assignments

def generate_schedule_random(semester, courses, rooms, availabilities, pre_assignments=None):
    if pre_assignments is None:
        pre_assignments = []
    assignments = list(pre_assignments)
    for course in courses:
        forced_day = random.choice(DAYS)
        forced_slot = random.choice([s for s in SLOTS if s != LUNCH_SLOT])
        
        # Lab goes to lab room usually, but random might fail it
        valid_rooms = [r for r in rooms if (course['type'] == 'Lab' and r['type'] == 'Lab')]
        if not valid_rooms or random.random() < 0.3: # 30% chance to pick any room
            valid_rooms = rooms
            
        forced_room = random.choice(valid_rooms)
        assignments.append({
            'course_id': course['id'],
            'room_id': forced_room['id'],
            'teacher_id': course['teacher_id'],
            'day': forced_day,
            'time_slot': forced_slot,
            'semester': course['semester']
        })
    return assignments

# --- REST APIS ---

# 1. Static Routes to serve the app
@app.route('/')
def serve_home():
    return send_from_directory('.', 'index.html')

@app.route('/login.html')
def serve_login():
    return send_from_directory('.', 'login.html')

@app.route('/role-selection.html')
def serve_roles():
    return send_from_directory('.', 'role-selection.html')

@app.route('/<string:folder>/<path:path>')
def serve_subfolders(folder, path):
    if folder in ['admin', 'student', 'teacher', 'css', 'js', 'assets']:
        return send_from_directory(folder, path)
    return "Not Found", 404

# 2. Auth Endpoint
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ? AND password = ?", (email, password))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return jsonify({
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role']
        })
    return jsonify({'error': 'Invalid email or password'}), 401

@app.route('/api/profile', methods=['PUT'])
def api_update_profile():
    data = request.json
    user_id = data.get('id')
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not user_id or not name or not email:
        return jsonify({'error': 'ID, Name, and Email are required.'}), 400
        
    conn = get_db()
    cursor = conn.cursor()
    try:
        if password:
            cursor.execute('''
                UPDATE users
                SET name = ?, email = ?, password = ?
                WHERE id = ?
            ''', (name, email, password, user_id))
        else:
            cursor.execute('''
                UPDATE users
                SET name = ?, email = ?
                WHERE id = ?
            ''', (name, email, user_id))
        conn.commit()
        
        # Retrieve updated user
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        return jsonify({
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role']
        })
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Email is already in use by another user.'}), 400

# 3. Courses CRUD
@app.route('/api/courses', methods=['GET', 'POST'])
def api_courses():
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('''
            SELECT c.*, u.name as teacher_name 
            FROM courses c 
            LEFT JOIN users u ON c.teacher_id = u.id
        ''')
        courses = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(courses)
        
    elif request.method == 'POST':
        data = request.json
        try:
            cursor.execute('''
                INSERT INTO courses (code, name, semester, credits, department, type, student_count, teacher_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('code'),
                data.get('name'),
                data.get('semester'),
                data.get('credits', 3),
                data.get('department', 'Computer Science'),
                data.get('type', 'Lecture'),
                data.get('student_count', 35),
                data.get('teacher_id')
            ))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            return jsonify({'id': new_id, 'message': 'Course added successfully'}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'Course code already exists'}), 400

@app.route('/api/courses/<int:id>', methods=['PUT', 'DELETE'])
def api_modify_course(id):
    conn = get_db()
    cursor = conn.cursor()
    if request.method == 'DELETE':
        cursor.execute("DELETE FROM courses WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Course deleted successfully'})
    elif request.method == 'PUT':
        data = request.json
        try:
            cursor.execute('''
                UPDATE courses
                SET code = ?, name = ?, semester = ?, credits = ?, type = ?, teacher_id = ?, student_count = ?
                WHERE id = ?
            ''', (
                data.get('code'),
                data.get('name'),
                data.get('semester'),
                int(data.get('credits', 3)),
                data.get('type', 'Lecture'),
                int(data.get('teacher_id')) if data.get('teacher_id') else None,
                int(data.get('student_count', 35)),
                id
            ))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Course updated successfully'})
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'Course code already exists'}), 400

# 4. Rooms CRUD
@app.route('/api/rooms', methods=['GET', 'POST'])
def api_rooms():
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        # Join check to determine "In Use" status based on active timetable
        cursor.execute('''
            SELECT r.*, 
                   EXISTS(SELECT 1 FROM timetable t WHERE t.room_id = r.id) as in_use
            FROM rooms r
        ''')
        rooms = []
        for row in cursor.fetchall():
            d = dict(row)
            d['status'] = 'In Use' if d['in_use'] else 'Available'
            rooms.append(d)
        conn.close()
        return jsonify(rooms)
        
    elif request.method == 'POST':
        data = request.json
        try:
            cursor.execute('''
                INSERT INTO rooms (room_num, name, type, capacity)
                VALUES (?, ?, ?, ?)
            ''', (
                data.get('room_num'),
                data.get('name'),
                data.get('type', 'Classroom'),
                data.get('capacity', 40)
            ))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            return jsonify({'id': new_id, 'message': 'Room added successfully'}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'Room number already exists'}), 400

@app.route('/api/rooms/<int:id>', methods=['DELETE'])
def api_delete_room(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM rooms WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Room deleted successfully'})

# 5. Teachers CRUD
@app.route('/api/teachers', methods=['GET', 'POST'])
def api_teachers():
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('''
            SELECT u.id, u.name, u.email, 
                   (SELECT COUNT(*) FROM courses c WHERE c.teacher_id = u.id) as course_count
            FROM users u
            WHERE u.role = 'teacher'
        ''')
        teachers = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(teachers)
        
    elif request.method == 'POST':
        data = request.json
        try:
            # First create the user
            cursor.execute('''
                INSERT INTO users (email, password, name, role)
                VALUES (?, ?, ?, 'teacher')
            ''', (
                data.get('email'),
                'teacher123', # Default password
                data.get('name')
            ))
            teacher_id = cursor.lastrowid
            
            # Setup default availability
            default_avail = {day: [slot for slot in SLOTS if slot != LUNCH_SLOT] for day in DAYS}
            default_avail['Saturday'] = []
            cursor.execute('''
                INSERT INTO teacher_availability (teacher_id, availability)
                VALUES (?, ?)
            ''', (teacher_id, json.dumps(default_avail)))
            
            # If courses are assigned
            courses = data.get('courses', [])
            for c_id in courses:
                cursor.execute("UPDATE courses SET teacher_id = ? WHERE id = ?", (teacher_id, c_id))
                
            conn.commit()
            conn.close()
            return jsonify({'id': teacher_id, 'message': 'Teacher added successfully'}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'Email already exists'}), 400

@app.route('/api/teachers/<int:id>', methods=['DELETE'])
def api_delete_teacher(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ? AND role = 'teacher'", (id,))
    cursor.execute("DELETE FROM teacher_availability WHERE teacher_id = ?", (id,))
    cursor.execute("UPDATE courses SET teacher_id = NULL WHERE teacher_id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Teacher deleted successfully'})

# 6. Teacher Availability (Get and Post)
@app.route('/api/teachers/availability', methods=['GET', 'POST'])
def api_teacher_availability():
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        t_id = request.args.get('teacher_id')
        cursor.execute("SELECT availability FROM teacher_availability WHERE teacher_id = ?", (t_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return jsonify(json.loads(row['availability']))
        return jsonify({})
        
    elif request.method == 'POST':
        data = request.json
        t_id = data.get('teacher_id')
        avail_str = json.dumps(data.get('availability', {}))
        
        cursor.execute('''
            INSERT INTO teacher_availability (teacher_id, availability)
            VALUES (?, ?)
            ON CONFLICT(teacher_id) DO UPDATE SET availability = excluded.availability
        ''', (t_id, avail_str))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Availability saved successfully'})

# 7. Students CRUD
@app.route('/api/students', methods=['GET', 'POST'])
def api_students():
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        # Fetching roll_num / semester properties as metadata or mock properties
        cursor.execute('''
            SELECT u.id, u.name, u.email,
                   'CS-2026-' || u.id as roll_no, 
                   '3rd Semester' as semester,
                   'Computer Science' as department
            FROM users u
            WHERE u.role = 'student'
        ''')
        students = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(students)
        
    elif request.method == 'POST':
        data = request.json
        try:
            cursor.execute('''
                INSERT INTO users (email, password, name, role)
                VALUES (?, ?, ?, 'student')
            ''', (
                data.get('email'),
                'student123', # Default password
                data.get('name')
            ))
            conn.commit()
            student_id = cursor.lastrowid
            conn.close()
            return jsonify({'id': student_id, 'message': 'Student added successfully'}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'Email already exists'}), 400

@app.route('/api/students/<int:id>', methods=['DELETE'])
def api_delete_student(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ? AND role = 'student'", (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Student deleted successfully'})

# 8. Announcements
@app.route('/api/announcements', methods=['GET', 'POST'])
def api_announcements():
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        role = request.args.get('role', 'all')
        if role == 'admin':
            cursor.execute("SELECT * FROM announcements ORDER BY id DESC")
        else:
            cursor.execute("SELECT * FROM announcements WHERE role_target = 'all' OR role_target = ? ORDER BY id DESC", (role,))
        announcements = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(announcements)
        
    elif request.method == 'POST':
        data = request.json
        cursor.execute('''
            INSERT INTO announcements (title, content, date, role_target)
            VALUES (?, ?, ?, ?)
        ''', (
            data.get('title'),
            data.get('content'),
            datetime.now().strftime('%Y-%m-%d'),
            data.get('role_target', 'all')
        ))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': new_id, 'message': 'Announcement published successfully'}), 201

@app.route('/api/announcements/<int:id>', methods=['DELETE'])
def api_delete_announcement(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM announcements WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Announcement deleted successfully'})

# 9. Reschedule/Extra Class Requests
@app.route('/api/requests', methods=['GET', 'POST', 'PUT'])
def api_requests():
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        t_id = request.args.get('teacher_id')
        if t_id:
            cursor.execute('''
                SELECT r.*, u.name as teacher_name 
                FROM requests r
                JOIN users u ON r.teacher_id = u.id
                WHERE r.teacher_id = ?
                ORDER BY r.id DESC
            ''', (t_id,))
        else:
            cursor.execute('''
                SELECT r.*, u.name as teacher_name 
                FROM requests r
                JOIN users u ON r.teacher_id = u.id
                ORDER BY r.id DESC
            ''')
        reqs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(reqs)
        
    elif request.method == 'POST':
        data = request.json
        cursor.execute('''
            INSERT INTO requests (teacher_id, type, title, details, status)
            VALUES (?, ?, ?, ?, 'Pending')
        ''', (
            data.get('teacher_id'),
            data.get('type'),
            data.get('title'),
            data.get('details')
        ))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': new_id, 'message': 'Request submitted successfully'}), 201
        
    elif request.method == 'PUT':
        data = request.json
        req_id = data.get('id')
        status = data.get('status')
        
        cursor.execute("UPDATE requests SET status = ? WHERE id = ?", (status, req_id))
        conn.commit()
        conn.close()
        return jsonify({'message': f'Request status updated to {status}'})

# 10. Timetable retrieve
@app.route('/api/timetable', methods=['GET'])
def api_timetable():
    conn = get_db()
    cursor = conn.cursor()
    
    teacher_id = request.args.get('teacher_id')
    semester = request.args.get('semester')
    room_id = request.args.get('room_id')
    
    query = '''
        SELECT t.id, t.day, t.time_slot, t.semester,
               c.code as course_code, c.name as course_name, c.type as course_type,
               r.room_num, r.name as room_name,
               u.name as teacher_name, u.id as teacher_id
        FROM timetable t
        JOIN courses c ON t.course_id = c.id
        JOIN rooms r ON t.room_id = r.id
        JOIN users u ON t.teacher_id = u.id
    '''
    params = []
    conditions = []
    
    if teacher_id:
        conditions.append("t.teacher_id = ?")
        params.append(teacher_id)
    if semester:
        conditions.append("t.semester = ?")
        params.append(semester)
    if room_id:
        conditions.append("t.room_id = ?")
        params.append(room_id)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    cursor.execute(query, params)
    timetable = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(timetable)

# 10b. Update or Delete specific Timetable Entry
@app.route('/api/timetable/<int:id>', methods=['PUT', 'DELETE'])
def api_modify_timetable_entry(id):
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'DELETE':
        cursor.execute("DELETE FROM timetable WHERE id = ?", (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Timetable entry deleted successfully'})
        
    elif request.method == 'PUT':
        data = request.json
        day = data.get('day')
        time_slot = data.get('time_slot')
        room_num = data.get('room_num')
        
        # Resolve room_id from room_num
        cursor.execute("SELECT id FROM rooms WHERE room_num = ?", (room_num,))
        room_row = cursor.fetchone()
        if not room_row:
            conn.close()
            return jsonify({'error': f'Room {room_num} not found'}), 400
            
        cursor.execute('''
            UPDATE timetable
            SET day = ?, time_slot = ?, room_id = ?
            WHERE id = ?
        ''', (day, time_slot, room_row['id'], id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Timetable entry updated successfully'})

# 11. Timetable Conflict Check
@app.route('/api/timetable/conflicts', methods=['GET'])
def api_timetable_conflicts():
    conflicts = run_conflict_check()
    return jsonify(conflicts)

# 12. Timetable Generation
@app.route('/api/timetable/generate', methods=['POST'])
def api_timetable_generate():
    data = request.json
    semester = data.get('semester', 'All Semesters')
    algorithm = data.get('algorithm', 'Constraint-Based')
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Fetch rooms
    cursor.execute("SELECT id, room_num, type, capacity FROM rooms")
    rooms = [dict(row) for row in cursor.fetchall()]
    
    # Fetch teacher availabilities
    cursor.execute("SELECT teacher_id, availability FROM teacher_availability")
    availabilities = {row['teacher_id']: json.loads(row['availability']) for row in cursor.fetchall()}
    
    pre_assignments = []
    
    if semester == 'All Semesters' or not semester:
        # Clear existing timetable entirely
        cursor.execute("DELETE FROM timetable")
        conn.commit()
        
        # Load all courses that have teachers assigned
        cursor.execute("SELECT id, name, type, teacher_id, semester FROM courses WHERE teacher_id IS NOT NULL")
        courses = [dict(row) for row in cursor.fetchall()]
    else:
        # Clear only this cohort's timetable entries
        cursor.execute("DELETE FROM timetable WHERE semester = ?", (semester,))
        conn.commit()
        
        # Load all OTHER timetable entries as pre_assignments
        cursor.execute("SELECT course_id, room_id, teacher_id, day, time_slot, semester FROM timetable")
        pre_assignments = [dict(row) for row in cursor.fetchall()]
        
        # Load courses only for this specific semester/cohort
        cursor.execute("SELECT id, name, type, teacher_id, semester FROM courses WHERE semester = ? AND teacher_id IS NOT NULL", (semester,))
        courses = [dict(row) for row in cursor.fetchall()]
        
    if not courses or not rooms:
        conn.close()
        return jsonify({'error': 'No courses or rooms available to schedule'}), 400
        
    # Run scheduling algorithm starting with pre_assignments
    assignments = []
    if algorithm == 'Constraint-Based':
        assignments = generate_schedule_backtracking(semester, courses, rooms, availabilities, pre_assignments)
        if assignments is None:
            # Fallback to greedy
            assignments = generate_schedule_greedy(semester, courses, rooms, availabilities, pre_assignments)
            status = 'Partial Success (Greedy Fallback)'
        else:
            status = 'Success'
    elif algorithm == 'Greedy Algorithm':
        assignments = generate_schedule_greedy(semester, courses, rooms, availabilities, pre_assignments)
        status = 'Success'
    else: # Random Assignment
        assignments = generate_schedule_random(semester, courses, rooms, availabilities, pre_assignments)
        status = 'Success'
        
    # Write assignments to Database
    scheduled_count = 0
    if assignments:
        for ass in assignments:
            # Only insert newly scheduled ones! (i.e. where semester matches target semester, 
            # OR if we scheduled All Semesters)
            if semester == 'All Semesters' or not semester or ass['semester'] == semester:
                cursor.execute('''
                    INSERT INTO timetable (course_id, room_id, teacher_id, day, time_slot, semester)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    ass['course_id'],
                    ass['room_id'],
                    ass['teacher_id'],
                    ass['day'],
                    ass['time_slot'],
                    ass['semester']
                ))
                scheduled_count += 1
        conn.commit()
        
    # Run conflict checking on the generated schedule
    conflicts = run_conflict_check()
    conflicts_count = len(conflicts)
    
    # Update History
    cursor.execute('''
        INSERT INTO generation_history (date, semester, status, conflicts_count, conflicts_details)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        datetime.now().strftime('%Y-%m-%d'),
        semester,
        'Success' if conflicts_count == 0 else 'Success with Conflicts',
        conflicts_count,
        json.dumps(conflicts)
    ))
    conn.commit()
    conn.close()
    
    return jsonify({
        'status': status,
        'scheduled_count': scheduled_count,
        'conflicts_count': conflicts_count,
        'conflicts': conflicts
    })

@app.route('/api/timetable/history', methods=['GET'])
def api_timetable_history():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM generation_history ORDER BY id DESC")
    history = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(history)

# --- AI ASSISTANT CHAT ENGINE (Offline Intelligent & Online Gemini) ---

def run_offline_ai_query(message):
    message = message.lower().strip()
    
    conn = get_db()
    cursor = conn.cursor()
    
    response = ""
    
    # 1. HELP / CAPABILITIES
    if 'help' in message or 'capabilities' in message or 'what can you do' in message:
        response = """🤖 **Hello! I am your Smart Scheduler AI Assistant (Offline Mode).**

Here is what you can ask me:
1. **Teacher Schedule**: "What classes does Sir Farhan have?" or "Sir Ali's schedule"
2. **Room Bookings**: "Show bookings for CS-301" or "Is CS-302 free?"
3. **Conflicts**: "Check schedule conflicts" or "Are there any scheduling issues?"
4. **Reschedule Requests**: "What requests are pending?"
5. **Announcement Templates**: "Draft announcement about class reschedule"
6. **Statistics**: "How many courses and rooms do we have?"
7. **Find Teachers**: "Who teaches Data Structures?"
8. **Cohort Schedules**: "What is the schedule for 3rd Semester?"
9. **General Lists**: "List all courses", "List all rooms", "List all teachers", "List all students"

*Feel free to query any timetable details directly!*"""

    # 2. STATISTICS
    elif 'statistics' in message or 'count' in message or 'how many' in message and not any(k in message for k in ['class', 'booking', 'schedule']):
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'student'")
        s_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'teacher'")
        t_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM courses")
        c_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM rooms")
        r_count = cursor.fetchone()[0]
        
        response = f"""📊 **Campus Smart Scheduler Statistics:**
- **Total Students enrolled**: {s_count}
- **Faculty / Teachers**: {t_count}
- **Total Courses**: {c_count}
- **Rooms & Labs**: {r_count}"""

    # 3. LIST ALL COURSES
    elif 'list' in message and 'course' in message:
        cursor.execute('''
            SELECT c.code, c.name, c.semester, c.credits, c.type, u.name as teacher_name 
            FROM courses c 
            LEFT JOIN users u ON c.teacher_id = u.id
        ''')
        courses = cursor.fetchall()
        response = "📚 **List of Courses in Portal:**\n\n"
        for c in courses:
            t_name = c['teacher_name'] if c['teacher_name'] else 'Unassigned'
            response += f"- **{c['code']} - {c['name']}** ({c['type']}): {c['semester']} · {c['credits']} Credits · Teacher: {t_name}\n"

    # 4. LIST ALL TEACHERS
    elif 'list' in message and ('teacher' in message or 'faculty' in message):
        cursor.execute("SELECT name, email FROM users WHERE role = 'teacher'")
        teachers = cursor.fetchall()
        response = "👨‍🏫 **List of Faculty Members:**\n\n"
        for t in teachers:
            response += f"- **{t['name']}** (Email: {t['email']})\n"

    # 5. LIST ALL ROOMS
    elif 'list' in message and 'room' in message:
        cursor.execute("SELECT room_num, name, type, capacity FROM rooms")
        rooms = cursor.fetchall()
        response = "🏫 **List of Classrooms and Labs:**\n\n"
        for r in rooms:
            response += f"- **Room {r['room_num']}** ({r['name']}): Type: {r['type']} · Capacity: {r['capacity']}\n"

    # 6. LIST ALL STUDENTS
    elif 'list' in message and 'student' in message:
        cursor.execute("SELECT name, email FROM users WHERE role = 'student'")
        students = cursor.fetchall()
        response = "👥 **List of Enrolled Students:**\n\n"
        for s in students:
            response += f"- **{s['name']}** (Email: {s['email']})\n"

    # 7. WHO TEACHES A SPECIFIC COURSE
    elif 'who teaches' in message or 'teacher for' in message or 'instructor for' in message:
        cursor.execute('''
            SELECT c.name, c.code, u.name as teacher_name 
            FROM courses c 
            LEFT JOIN users u ON c.teacher_id = u.id
        ''')
        courses = cursor.fetchall()
        matched = []
        for c in courses:
            if c['name'].lower() in message or c['code'].lower() in message:
                matched.append(c)
        if matched:
            response = ""
            for m in matched:
                t_name = m['teacher_name'] if m['teacher_name'] else 'no teacher assigned yet'
                response += f"📖 The teacher for **{m['name']} ({m['code']})** is **{t_name}**.\n"
        else:
            response = "I couldn't find a matching course in the database. Try asking with course names like 'Data Structures' or 'Database Systems'."

    # 8. COHORT / SEMESTER SCHEDULES
    elif 'schedule for' in message or 'timetable for' in message or 'semester schedule' in message or 'semester timetable' in message or any(word in message for word in ['1st semester', '2nd semester', '3rd semester', '4th semester', '5th semester', '6th semester', '7th semester', '8th semester']):
        # Extract semester
        sem_num = None
        for word in ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']:
            if word in message:
                sem_num = f"{word} Semester"
                break
        
        if sem_num:
            cursor.execute('''
                SELECT t.day, t.time_slot, c.name as course_name, r.room_num, u.name as teacher_name
                FROM timetable t
                JOIN courses c ON t.course_id = c.id
                JOIN rooms r ON t.room_id = r.id
                JOIN users u ON t.teacher_id = u.id
                WHERE t.semester = ?
                ORDER BY 
                  CASE t.day 
                    WHEN 'Monday' THEN 1 
                    WHEN 'Tuesday' THEN 2 
                    WHEN 'Wednesday' THEN 3 
                    WHEN 'Thursday' THEN 4 
                    WHEN 'Friday' THEN 5 
                    ELSE 6 
                  END, t.time_slot
            ''', (sem_num,))
            classes = cursor.fetchall()
            if classes:
                response = f"📅 **Timetable for {sem_num}:**\n"
                for cls in classes:
                    response += f"- **{cls['day']} at {cls['time_slot']}**: {cls['course_name']} in Room {cls['room_num']} (by {cls['teacher_name']})\n"
            else:
                response = f"📅 There are currently no classes scheduled for **{sem_num}** in the active timetable."
        else:
            response = "Please specify which semester cohort schedule you want to view (e.g. '3rd Semester' or '4th Semester')."

    # 9. TEACHER SCHEDULE
    elif any(t in message for t in ['sir farhan', 'farhan', 'sir ali', 'ali', 'sir hamza', 'hamza', 'sir ahmed', 'ahmed', 'sir usman', 'usman']):
        # Identify teacher
        cursor.execute("SELECT id, name FROM users WHERE role = 'teacher'")
        teachers = cursor.fetchall()
        matched_teacher = None
        for t in teachers:
            name_lower = t['name'].lower()
            parts = [p for p in name_lower.split() if p not in ['sir', 'dr', 'prof']]
            if any(part in message for part in parts if len(part) > 2):
                matched_teacher = t
                break
                
        if matched_teacher:
            cursor.execute('''
                SELECT t.day, t.time_slot, c.name as course_name, r.room_num
                FROM timetable t
                JOIN courses c ON t.course_id = c.id
                JOIN rooms r ON t.room_id = r.id
                JOIN users u ON t.teacher_id = u.id
                WHERE u.name = ?
                ORDER BY 
                  CASE t.day 
                    WHEN 'Monday' THEN 1 
                    WHEN 'Tuesday' THEN 2 
                    WHEN 'Wednesday' THEN 3 
                    WHEN 'Thursday' THEN 4 
                    WHEN 'Friday' THEN 5 
                    ELSE 6 
                  END, t.time_slot
            ''', (matched_teacher['name'],))
            classes = cursor.fetchall()
            
            if classes:
                response = f"📅 **Timetable for {matched_teacher['name']}:**\n"
                for cls in classes:
                    response += f"- **{cls['day']} at {cls['time_slot']}**: {cls['course_name']} in Room {cls['room_num']}\n"
            else:
                response = f"📅 **{matched_teacher['name']}** currently has no classes scheduled in the active timetable."
        else:
            response = "I couldn't identify the specific teacher. Try searching using names like 'Sir Farhan', 'Sir Ali', 'Sir Hamza', 'Sir Ahmed' or 'Sir Usman'."

    # 10. ROOM BOOKINGS
    elif any(r in message for r in ['cs-301', 'cs-302', 'cs lab 1', 'cs lab 2', 'seminar']):
        # Find room
        cursor.execute("SELECT id, room_num, name, type, capacity FROM rooms")
        rooms = cursor.fetchall()
        matched_room = None
        for r in rooms:
            if r['room_num'].lower() in message or r['name'].lower() in message:
                matched_room = r
                break
                
        if matched_room:
            cursor.execute('''
                SELECT t.day, t.time_slot, c.name as course_name, u.name as teacher_name
                FROM timetable t
                JOIN courses c ON t.course_id = c.id
                JOIN users u ON t.teacher_id = u.id
                WHERE t.room_id = ?
                ORDER BY 
                  CASE t.day 
                    WHEN 'Monday' THEN 1 
                    WHEN 'Tuesday' THEN 2 
                    WHEN 'Wednesday' THEN 3 
                    WHEN 'Thursday' THEN 4 
                    WHEN 'Friday' THEN 5 
                    ELSE 6 
                  END, t.time_slot
            ''', (matched_room['id'],))
            bookings = cursor.fetchall()
            
            response = f"🏫 **Bookings for Room {matched_room['room_num']} ({matched_room['name']}):**\n"
            response += f"Capacity: {matched_room['capacity']} | Type: {matched_room['type']}\n\n"
            if bookings:
                for b in bookings:
                    response += f"- **{b['day']} at {b['time_slot']}**: {b['course_name']} (by {b['teacher_name']})\n"
            else:
                response += "No classes scheduled in this room. It is fully available!"
        else:
            response = "I couldn't match that classroom. Try specifying 'CS-301', 'CS-302', 'CS Lab 1', 'CS Lab 2', or 'Seminar'."

    # 11. CONFLICTS
    elif 'conflict' in message or 'issue' in message or 'double booking' in message or 'overlap' in message:
        conflicts = run_conflict_check()
        if conflicts:
            response = f"⚠️ **Found {len(conflicts)} Scheduling Issues / Conflicts:**\n\n"
            for idx, c in enumerate(conflicts):
                sev = "🔴" if c['severity'] == 'Critical' else "🟡"
                response += f"{idx+1}. {sev} **[{c['type']}]** ({c['severity']})\n   {c['details']}\n"
        else:
            response = "✅ **Timetable is completely conflict-free!** Excellent assignment."

    # 12. RESCHEDULE REQUESTS
    elif 'request' in message or 'pending' in message:
        cursor.execute('''
            SELECT r.*, u.name as teacher_name 
            FROM requests r
            JOIN users u ON r.teacher_id = u.id
            ORDER BY r.id DESC
        ''')
        reqs = cursor.fetchall()
        if reqs:
            response = "📋 **Teacher Schedule & Reschedule Requests:**\n\n"
            for r in reqs:
                status_icon = "⏳" if r['status'] == 'Pending' else ("✅" if r['status'] == 'Approved' else "❌")
                response += f"- {status_icon} **{r['type']}** by *{r['teacher_name']}*: {r['title']} - {r['details']} ({r['status']})\n"
        else:
            response = "📋 No reschedule or extra class requests found."

    # 13. DRAFT ANNOUNCEMENT
    elif 'draft' in message or 'announcement' in message or 'template' in message:
        response = """📢 **Here is a draft announcement template for rescheduling:**

***
**Subject: Class Reschedule Notice — [Course Name]**

Dear Students,

Please note that the **[Course Name]** class originally scheduled for **[Old Day] at [Old Time]** has been rescheduled. 

The new class details are:
- **New Slot**: [New Day] at [New Time]
- **Room**: [Room Location]
- **Teacher**: [Teacher Name]

Please update your personal schedules accordingly. We apologize for any inconvenience.

Regards,  
Academic Administration  
Campus Smart Scheduler
***"""

    # 14. DEFAULT FALLBACK
    else:
        response = """🤖 **AI Scheduling Assistant:**
I understand you are asking about: *"{}"*. 

Since I'm running in offline mode, I support targeted queries like:
- "Sir Farhan's schedule"
- "Is Room CS-301 free?"
- "Who teaches Data Structures?"
- "What is the schedule for 3rd Semester?"
- "List all courses", "List all teachers", "List all rooms"
- "Show timetable conflicts"
- "Show pending requests"
- "Draft class change announcement"

Please try asking using one of those formats or check your spelling! To unlock custom natural language replies, add your `GEMINI_API_KEY` in the backend `.env` file.""".format(message)
        
    conn.close()
    return response

@app.route('/api/ai/chat', methods=['POST'])
def api_ai_chat():
    data = request.json
    user_message = data.get('message', '')
    
    # Check for Gemini API key
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        # Check if they have a .env file containing the key
        if os.path.exists('.env'):
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY'):
                        parts = line.strip().split('=')
                        if len(parts) > 1:
                            api_key = parts[1].strip().replace('"', '').replace("'", "")
                            break
                            
    if not api_key:
        # Fall back to offline intelligent scheduler assistant
        ai_response = run_offline_ai_query(user_message)
        return jsonify({'response': ai_response, 'mode': 'offline'})
        
    try:
        # Fetch current system context to inject into Gemini prompt
        conn = get_db()
        cursor = conn.cursor()
        
        # Gather courses
        cursor.execute("SELECT code, name, semester, type, (SELECT name FROM users WHERE id = teacher_id) as teacher FROM courses")
        courses_info = [dict(row) for row in cursor.fetchall()]
        
        # Gather rooms
        cursor.execute("SELECT room_num, name, type, capacity FROM rooms")
        rooms_info = [dict(row) for row in cursor.fetchall()]
        
        # Gather current timetable
        cursor.execute('''
            SELECT t.day, t.time_slot, t.semester, c.name as course_name, r.room_num, u.name as teacher_name
            FROM timetable t
            JOIN courses c ON t.course_id = c.id
            JOIN rooms r ON t.room_id = r.id
            JOIN users u ON t.teacher_id = u.id
        ''')
        timetable_info = [dict(row) for row in cursor.fetchall()]
        
        # Gather conflicts
        conflicts_info = run_conflict_check()
        
        # Gather pending requests
        cursor.execute("SELECT r.type, r.title, r.details, r.status, u.name as teacher_name FROM requests r JOIN users u ON r.teacher_id = u.id")
        requests_info = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        # Build System Context String
        system_context = f"""
You are the "Campus Smart Scheduler AI Assistant", an intelligent administrative system assistant for a university scheduling portal.
You help Admins, Teachers, and Students manage timetables, rooms, courses, and resolve scheduling issues.

Here is the current state of the university database:
1. COURSES IN PORTAL:
{json.dumps(courses_info, indent=2)}

2. ROOMS & LABS IN PORTAL:
{json.dumps(rooms_info, indent=2)}

3. ACTIVE TIMETABLE LAYOUT:
{json.dumps(timetable_info, indent=2)}

4. DETECTED CONFLICTS / VIOLATIONS (IF ANY):
{json.dumps(conflicts_info, indent=2)}

5. PENDING TEACHER SCHEDULING REQUESTS:
{json.dumps(requests_info, indent=2)}

Guidelines:
- Give professional, accurate, and direct scheduling answers based *only* on the database details provided above.
- If conflicts are detected, explain them clearly and suggest concrete slot moves (e.g. moving a class to another day or slot where the teacher, room, and student semester are all free).
- Respect standard university rules: Lab classes must be in Labs, 1:00 PM is Lunch Break.
- Keep answers formatted in clear markdown.
"""
        
        # Invoke Gemini API via urllib
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {'Content-Type': 'application/json'}
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": system_context},
                        {"text": f"User question: {user_message}"}
                    ]
                }
            ]
        }
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            
        ai_response = res_data['candidates'][0]['content']['parts'][0]['text']
        return jsonify({'response': ai_response, 'mode': 'gemini'})
        
    except Exception as e:
        # If API call fails, fall back to offline query
        ai_response = f"⚠️ *Note: Gemini API request encountered an issue ({str(e)}). Falling back to offline assistant.* \n\n" + run_offline_ai_query(user_message)
        return jsonify({'response': ai_response, 'mode': 'offline-fallback'})

if __name__ == '__main__':
    # Run server on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
