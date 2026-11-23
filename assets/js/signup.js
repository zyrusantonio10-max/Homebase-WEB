/*
  User registration validation and account creation service.
  Handles client-side validation rules and Supabase Auth sign-up.
  Supports both student and non-student resident accounts.
*/
(function (global) {
  'use strict';

  var USERS_KEY = 'homebase_users', CURRENT_KEY = 'homebase_currentUser';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var COMMON_PASSWORDS = ['password', 'password1', 'password12', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', 'iloveyou1', 'admin123', 'letmein123', 'welcome123'];
  var YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year+', 'Postgraduate / Masteral', 'Reviewee / Board Exam'];
  var GUARDIAN_RELATIONS = ['Mother', 'Father', 'Legal guardian', 'Other relative with legal authority'];
  var EMERGENCY_RELATIONS = ['Mother', 'Father', 'Guardian', 'Sibling', 'Relative', 'Friend', 'Other'];

  function squash(v) { return String(v == null ? '' : v).trim().replace(/\s+/g, ' '); }

  // Normalize Philippine mobile numbers to standard format
  function normMobile(v) {
    var d = String(v || '').replace(/[\s\-().]/g, '');
    if (/^\+639\d{9}$/.test(d)) d = '0' + d.slice(3);
    else if (/^639\d{9}$/.test(d)) d = '0' + d.slice(2);
    if (!/^09\d{9}$/.test(d)) return null;
    return d.slice(0, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7);
  }

  // Field validation rules
  var V = {
    name: function (v, label) {
      v = squash(v);
      if (!v) return 'Enter your full name.';
      if (v.split(' ').length < 2) return 'Enter your first and last name, as on ' + (label || 'your ID') + '.';
      if (!/^[\p{L}][\p{L} .'\-]{1,59}$/u.test(v)) return 'Use letters only. Spaces, dots, hyphens and apostrophes are fine.';
      return '';
    },
    email: function (v) {
      v = String(v || '').trim();
      if (!v) return 'Enter your email.';
      if (v.length > 120 || !EMAIL_RE.test(v)) return 'That email does not look right. It should look like name@example.com.';
      return '';
    },
    password: function (v, name, email) {
      v = String(v || '');
      if (!v) return 'Create a password.';
      if (v.length < 8) return 'Use at least 8 characters.';
      if (v.length > 72) return 'Use 72 characters or fewer.';
      if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return 'Include at least one letter and one number.';
      if (COMMON_PASSWORDS.indexOf(v.toLowerCase()) !== -1) return 'That password is too common. Choose something harder to guess.';
      var local = String(email || '').split('@')[0].toLowerCase();
      if (local.length >= 4 && v.toLowerCase().indexOf(local) !== -1) return 'Your password should not contain your email name.';
      return '';
    },
    dob: function (v) {
      if (!v) return 'Enter your date of birth.';
      var age = HB_AUTH.ageFromDob(v);
      if (age === null || isNaN(new Date(v + 'T00:00:00').getTime())) return 'Enter a real date.';
      if (new Date(v + 'T00:00:00') > new Date()) return 'Your date of birth cannot be in the future.';
      if (age < 15) return 'Homebase is for residents aged 15 and above. Please contact the dormitory office.';
      if (age > 70) return 'Please check the year.';
      return '';
    },
    mobile: function (v) { return !squash(v) ? 'Enter your mobile number.' : (normMobile(v) ? '' : 'Enter a Philippine mobile number, like 0917 123 4567.'); },
    studentId: function (v) {
      v = squash(v);
      if (!v) return 'Enter your student ID number.';
      return /^[A-Za-z0-9][A-Za-z0-9\-\/]{3,19}$/.test(v) ? '' : 'Use 4 to 20 letters, numbers or dashes, as printed on your school ID.';
    },
    text: function (v, label, min, max) {
      v = squash(v);
      if (!v) return 'Enter ' + label + '.';
      if (v.length < min) return 'That looks too short.';
      return v.length > max ? 'Use ' + max + ' characters or fewer.' : '';
    },
    optionalText: function (v, max) { return squash(v).length > max ? 'Use ' + max + ' characters or fewer.' : ''; },
    choice: function (v, list, label) { return list.indexOf(v) === -1 ? 'Choose ' + label + '.' : ''; }
  };

  function readUsers() { try { var u = JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); return Array.isArray(u) ? u : []; } catch (e) { return []; } }

  // Validate full registration payload
  function validate(d) {
    var e, bad = function (step, field, error) { return { step: step, field: field, error: error }; };
    var isStudent = d.isStudent !== false && d.userType !== 'non_student';
    if ((e = V.name(d.name, isStudent ? 'your school ID' : 'your ID'))) return bad(1, 'name', e);
    if ((e = V.email(d.email))) return bad(1, 'email', e);
    if ((e = V.password(d.password, d.name, d.email))) return bad(1, 'password', e);
    if (d.password !== d.confirm) return bad(1, 'confirm', 'The two passwords do not match.');
    if ((e = V.dob(d.dob))) return bad(2, 'dob', e);
    if ((e = V.mobile(d.mobile))) return bad(2, 'mobile', e);
    if (isStudent) {
      if ((e = V.text(d.school, 'your school or university', 2, 80))) return bad(2, 'school', e);
      if ((e = V.studentId(d.studentId))) return bad(2, 'studentId', e);
      if ((e = V.text(d.course, 'your course or program', 2, 80))) return bad(2, 'course', e);
      if ((e = V.choice(d.yearLevel, YEARS, 'your year level'))) return bad(2, 'yearLevel', e);
    } else {
      if ((e = V.text(d.occupation, 'your occupation or profession', 2, 80))) return bad(2, 'occupation', e);
      if ((e = V.optionalText(d.workplace, 80))) return bad(2, 'workplace', e);
    }
    if ((e = V.optionalText(d.province, 60))) return bad(2, 'province', e);
    var minor = HB_AUTH.ageFromDob(d.dob) < 18, myMobile = normMobile(d.mobile);
    if (minor) {
      var g = d.guardian || {};
      if ((e = V.name(g.name))) return bad(3, 'gName', e.replace('your full name', 'their full name').replace('your first and last name, as on your school ID', 'their first and last name').replace('your first and last name, as on your ID', 'their first and last name'));
      if ((e = V.choice(g.relationship, GUARDIAN_RELATIONS, 'how they are related to you'))) return bad(3, 'gRel', e);
      if ((e = V.mobile(g.mobile))) return bad(3, 'gMobile', e.replace('Enter your mobile number', 'Enter their mobile number'));
      if (normMobile(g.mobile) === myMobile) return bad(3, 'gMobile', 'Use your parent or guardian\u2019s own number, not yours.');
      if ((e = V.email(g.email))) return bad(3, 'gEmail', e.replace('Enter your email', 'Enter their email'));
      if (String(g.email).trim().toLowerCase() === String(d.email).trim().toLowerCase()) return bad(3, 'gEmail', 'Use your parent or guardian\u2019s own email, not yours.');
    } else {
      var m = d.emergency || {};
      if ((e = V.name(m.name))) return bad(3, 'eName', e.replace('your full name', 'their full name').replace('your first and last name, as on your school ID', 'their first and last name').replace('your first and last name, as on your ID', 'their first and last name'));
      if ((e = V.choice(m.relationship, EMERGENCY_RELATIONS, 'how they are related to you'))) return bad(3, 'eRel', e);
      if ((e = V.mobile(m.mobile))) return bad(3, 'eMobile', e.replace('Enter your mobile number', 'Enter their mobile number'));
      if (normMobile(m.mobile) === myMobile) return bad(3, 'eMobile', 'Use a different number from your own, so someone else can be reached.');
    }
    if (!d.consent) return bad(3, 'consent', 'Tick the box to agree before creating your account.');
    return null;
  }

  // Create the account in Supabase. Resolves to { ok: true, user, minor, code } or { ok: false, step, field, error }.
  function registerStudent(d) {
    var problem = validate(d);
    if (problem) return Promise.resolve({ ok: false, step: problem.step, field: problem.field, error: problem.error });
    if (!global.HB_DB) return Promise.resolve({ ok: false, step: 3, field: null, error: 'Cannot reach the database right now. Check your internet connection and try again.' });

    var isStudent = d.isStudent !== false && d.userType !== 'non_student';
    var email = String(d.email).trim().toLowerCase();
    var minor = HB_AUTH.ageFromDob(d.dob) < 18, guardian = {}, emergency;
    if (minor) {
      var g = d.guardian;
      guardian = { name: squash(g.name), relationship: g.relationship, mobile: normMobile(g.mobile), email: String(g.email).trim().toLowerCase() };
      emergency = { name: guardian.name, relationship: guardian.relationship, mobile: guardian.mobile };   // a minor's guardian is also the emergency contact
    } else {
      emergency = { name: squash(d.emergency.name), relationship: d.emergency.relationship, mobile: normMobile(d.emergency.mobile) };
    }

    var schoolVal = isStudent ? squash(d.school) : (squash(d.workplace) || null);
    var studentIdVal = isStudent ? squash(d.studentId) : null;
    var courseVal = isStudent ? squash(d.course) : squash(d.occupation);
    var yearLevelVal = isStudent ? d.yearLevel : 'Working Professional';

    // This metadata is read by the database trigger (handle_new_user), which creates the profile row.
    var meta = {
      name: squash(d.name),
      dob: d.dob,
      mobile: normMobile(d.mobile),
      school: schoolVal,
      student_id: studentIdVal,
      course: courseVal,
      year_level: yearLevelVal,
      province: squash(d.province),
      emergency: emergency,
      guardian: guardian,
      user_type: isStudent ? 'student' : 'non_student',
      occupation: !isStudent ? squash(d.occupation) : null,
      workplace: !isStudent ? squash(d.workplace) : null,
      role: 'student'
    };
    var netErr = { ok: false, step: 3, field: null, error: 'Cannot reach the database right now. Check your internet connection and try again.' };

    return global.HB_DB.auth.signUp({ email: email, password: String(d.password), options: { data: meta } }).then(function (r) {
      if (r.error) {
        if (/already|registered|exists/i.test(r.error.message || '')) return { ok: false, step: 1, field: 'email', error: 'An account with this email already exists. Log in instead.' };
        if (/database error|student_id|duplicate/i.test(r.error.message || '')) return { ok: false, step: 2, field: 'studentId', error: 'An account with this student ID already exists. Log in instead, or ask the dormitory office for help.' };
        return { ok: false, step: 3, field: null, error: 'We could not create your account: ' + (r.error.message || 'unknown error') };
      }
      if (!r.data || !r.data.user) return netErr;
      if (!r.data.session) return { ok: false, step: 3, field: null, error: 'Your account was created, but email confirmation is switched on in Supabase. Turn off "Confirm email" (Authentication, Sign In / Providers, Email) or confirm the email, then log in.' };
      return HB_AUTH.loadProfile(r.data.user.id).then(function (pr) {
        if (pr.error || !pr.data) return { ok: false, step: 3, field: null, error: 'Your account was created, but the profile could not be loaded. Try logging in.' };
        if (!isStudent && !pr.data.course && courseVal) {
          pr.data.course = courseVal;
        }
        if (!isStudent) {
          pr.data.user_type = 'non_student';
          pr.data.occupation = squash(d.occupation);
          if (d.workplace) pr.data.workplace = squash(d.workplace);
        }
        var session = HB_AUTH.cacheProfile(pr.data);
        if (session && !isStudent) session.userType = 'non_student';
        return { ok: true, user: session || { name: pr.data.name, email: pr.data.email, userType: isStudent ? 'student' : 'non_student' }, minor: minor, code: pr.data.guardian_code || '' };
      });
    }, function () { return netErr; });
  }

  global.HB_SIGNUP = { V: V, YEARS: YEARS, GUARDIAN_RELATIONS: GUARDIAN_RELATIONS, EMERGENCY_RELATIONS: EMERGENCY_RELATIONS, normMobile: normMobile, validate: validate, registerStudent: registerStudent, registerUser: registerStudent };
})(window);