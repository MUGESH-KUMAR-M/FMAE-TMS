// FMAE-TMS — Email Service
// Handles all 8 email triggers from PRD §9 (including 2 gap fixes)
const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"${process.env.EMAIL_FROM_NAME || 'FMAE-TMS'}" <${process.env.EMAIL_FROM || 'noreply@fmae.in'}>`;

const baseStyle = `
  font-family: 'Inter', Arial, sans-serif;
  background: #000; color: #fff;
  max-width: 600px; margin: 0 auto;
  border: 1px solid #333; border-radius: 8px;
`;

function htmlWrap(content) {
  return `
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <title>FMAE-TMS</title></head>
    <body style="background:#000; margin:0; padding:20px;">
    <div style="${baseStyle} overflow:hidden;">
      <div style="width:100%; height:150px; background:#111; overflow:hidden;">
        <img src="https://raw.githubusercontent.com/MUGESH-KUMAR-M/FMAE-TMS/main/backend/uploads/fmae_email_banner.png" 
             alt="FMAE Header" style="width:100%; height:100%; object-fit:cover; opacity:0.8;">
      </div>
      <div style="padding:40px;">
        <div style="border-bottom:2px solid #fff; padding-bottom:20px; margin-bottom:30px;">
          <h1 style="margin:0; font-size:24px; letter-spacing:2px;">FMAE-TMS</h1>
          <p style="margin:4px 0 0; color:#aaa; font-size:12px; letter-spacing:1px;">
            FORMULA / MOTORSPORT ACTIVITY EVENT — TEAM MANAGEMENT SYSTEM
          </p>
        </div>
        ${content}
        <div style="margin-top:40px; padding-top:20px; border-top:1px solid #333;
                    font-size:11px; color:#666; text-align:center;">
          © 2026 FMAE-TMS. This is an automated email, please do not reply directly.<br>
          For support contact: support@fmae.in
        </div>
      </div>
    </div>
    </body></html>
  `;
}

async function sendEmail(to, subject, html, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        // In development, log email to console instead of sending
    logger.info(`[EMAIL] To: ${to} | Subject: ${subject}`);
      logger.debug('[EMAIL] HTML preview logged (not sent in dev mode)');
        return { messageId: 'dev-mode', preview: true };
      }
      const result = await transporter.sendMail({ from: FROM, to, subject, html });
      logger.info(`[EMAIL] Sent to ${to}: ${subject} [${result.messageId}]`);
      return result;
    } catch (err) {
      logger.warn(`[EMAIL] Attempt ${attempt}/${retries} failed to ${to}: ${err.message}`);
      if (attempt === retries) {
        logger.error(`[EMAIL] Permanently failed after ${retries} attempts to ${to}: ${err.message}`);
        // Store in database for manual retry (optional - if table exists)
        try {
          const pool = require('../config/database');
          await pool.query(
            `INSERT INTO failed_emails (to_email, subject, html, error, created_at) 
             VALUES ($1, $2, $3, $4, NOW())`,
            [to, subject, html, err.message]
          ).catch(() => {
            // Table may not exist, silently fail
          });
        } catch (storageErr) {
          logger.debug('Failed to store email in DB (table may not exist)');
        }
        return null;
      }
      // Exponential backoff: 1s, 2s, 4s
      const backoffTime = Math.pow(2, attempt - 1) * 1000;
      logger.debug(`Retrying email in ${backoffTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
}

// ─── EMAIL TRIGGER 1: Registration Submitted → Admin ─────────────────────────
async function sendRegistrationSubmittedToAdmin(adminEmail, registration) {
  const html = htmlWrap(`
    <h2 style="color:#fff;">New Registration Received</h2>
    <p style="color:#aaa;">A new team has registered and is awaiting review.</p>
    
    <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:8px;">Team Profile</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <tr><td style="padding:6px 0; color:#aaa; width:140px;">Team Name</td><td style="font-weight:bold;">${registration.team_name}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">College</td><td>${registration.college_name}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Competition</td><td>${registration.competition_name} (${registration.vehicle_class})</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Location</td><td>${registration.city}, ${registration.state}, ${registration.country}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Instagram</td><td>${registration.instagram_handle || 'N/A'}</td></tr>
    </table>

    <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:8px;">Leadership</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <tr><td style="padding:6px 0; color:#aaa; width:140px;">Captain</td><td>${registration.captain_name} (${registration.captain_email}, ${registration.captain_phone})</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Manager</td><td>${registration.manager_name} (${registration.manager_email}, ${registration.manager_phone})</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Faculty Advisor</td><td>${registration.advisor_name || 'N/A'} (${registration.advisor_email || '-'}, ${registration.advisor_phone || '-'})</td></tr>
    </table>

    <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:8px;">Billing Details</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <tr><td style="padding:6px 0; color:#aaa; width:140px;">Billing Name</td><td>${registration.billing_name}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">GST Number</td><td>${registration.billing_gst || 'Not Provided'}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Address</td><td>${registration.billing_address_line1}, ${registration.billing_city} - ${registration.billing_pin}</td></tr>
    </table>

    <p style="font-size:12px; color:#666;">Submitted At: ${new Date().toLocaleString('en-IN')}</p>
    
    <a href="${process.env.FRONTEND_URL}/admin/registrations/${registration.id}"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px; margin-top:20px;">
      Review Registration →
    </a>
  `);
  return sendEmail(adminEmail, `[FMAE-TMS] New Registration: ${registration.team_name}`, html);
}

// ─── EMAIL TRIGGER 1.5: Registration Received → Team ────────────────────────
async function sendRegistrationConfirmationToTeam(teamEmail, registration) {
  const html = htmlWrap(`
    <h2 style="color:#fff;">Registration Received ✓</h2>
    <p style="color:#aaa;">Dear <strong>${registration.captain_name}</strong>,</p>
    <p style="color:#aaa;">Thank you for registering team <strong>${registration.team_name}</strong> for <strong>${registration.competition_name}</strong>. We have received your application and it is currently being reviewed by our team.</p>
    
    <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:8px; margin-top:30px;">Team Profile</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <tr><td style="padding:6px 0; color:#aaa; width:140px;">Team Name</td><td style="font-weight:bold;">${registration.team_name}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">College</td><td>${registration.college_name}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Competition</td><td>${registration.competition_name} (${registration.vehicle_class})</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Location</td><td>${registration.city}, ${registration.state}, ${registration.country}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Instagram</td><td>${registration.instagram_handle || 'N/A'}</td></tr>
    </table>

    <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:8px;">Leadership</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <tr><td style="padding:6px 0; color:#aaa; width:140px;">Captain</td><td>${registration.captain_name} (${registration.captain_email}, ${registration.captain_phone})</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Manager</td><td>${registration.manager_name} (${registration.manager_email}, ${registration.manager_phone})</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Faculty Advisor</td><td>${registration.advisor_name || 'N/A'} (${registration.advisor_email || '-'}, ${registration.advisor_phone || '-'})</td></tr>
    </table>

    <h3 style="color:#fff; border-bottom:1px solid #333; padding-bottom:8px;">Billing Details</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <tr><td style="padding:6px 0; color:#aaa; width:140px;">Billing Name</td><td>${registration.billing_name}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">GST Number</td><td>${registration.billing_gst || 'Not Provided'}</td></tr>
      <tr><td style="padding:6px 0; color:#aaa;">Address</td><td>${registration.billing_address_line1}, ${registration.billing_city} - ${registration.billing_pin}</td></tr>
    </table>

    <div style="background:#111; border:1px solid #333; border-radius:6px; padding:20px; margin:20px 0;">
      <p style="margin:0 0 8px; color:#aaa; font-size:12px; letter-spacing:1px;">SUBMISSION STATUS</p>
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:6px 0; color:#aaa; width:140px;">Team ID</td><td style="font-weight:bold;">#${registration.id.toString().slice(-6).toUpperCase()}</td></tr>
        <tr><td style="padding:6px 0; color:#aaa;">Current Status</td><td style="color:#ffaa00;">PENDING REVIEW</td></tr>
      </table>
    </div>

    <h3 style="color:#fff;">What happens next?</h3>
    <ol style="color:#aaa; line-height:1.8; padding-left:20px;">
      <li>Our administrators will verify your details and eligibility.</li>
      <li>Once approved, you will receive another email with your login credentials for the Team Portal.</li>
      <li>You will then be able to pay the registration fee and start your competition journey.</li>
    </ol>

    <p style="color:#aaa; margin-top:20px;">You can track your registration status at any time using the link below:</p>
    
    <a href="${process.env.FRONTEND_URL}/track-registration/${registration.id}"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px; margin-top:10px;">
      Track Registration Status →
    </a>

    <p style="color:#666; font-size:12px; margin-top:30px;">
      If you have any questions regarding your registration, please contact our support team at <a href="mailto:support@fmae.in" style="color:#999;">support@fmae.in</a>.
    </p>
  `);
  return sendEmail(teamEmail, `[FMAE-TMS] Registration Received: ${registration.team_name}`, html);
}

// ─── EMAIL TRIGGER 2: Registration Approved → Team ───────────────────────────
async function sendRegistrationApproved(teamEmail, data) {
  const html = htmlWrap(`
    <h2 style="color:#fff;">Registration Approved</h2>
    <p style="color:#aaa;">Congratulations! Your team has been approved to participate in <strong>${data.competition_name}</strong>.</p>
    <div style="background:#111; border:1px solid #333; border-radius:6px; padding:20px; margin:20px 0;">
      <p style="margin:0 0 8px; color:#aaa; font-size:12px; letter-spacing:1px;">YOUR LOGIN CREDENTIALS</p>
      <table style="width:100%;">
        <tr><td style="color:#aaa; padding:4px 0; width:120px;">Login Email:</td>
            <td style="font-weight:bold;">${data.login_email}</td></tr>
        <tr><td style="color:#aaa; padding:4px 0;">Password:</td>
            <td style="font-weight:bold; font-family:monospace; font-size:16px;">${data.temp_password}</td></tr>
      </table>
    </div>
    <p style="color:#ff4444; font-size:13px;">⚠️ This is a temporary password. You will be prompted to change it on first login.</p>
    <h3 style="color:#fff;">Next Steps:</h3>
    <ol style="color:#aaa; line-height:1.8;">
      <li>Login at <a href="${process.env.FRONTEND_URL}/login" style="color:#fff;">${process.env.FRONTEND_URL}/login</a></li>
      <li>Change your temporary password</li>
      <li>Complete your team dashboard setup</li>
      <li>Monitor tasks and deadlines</li>
    </ol>
    <a href="${process.env.FRONTEND_URL}/login"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px;">
      Login Now →
    </a>
  `);
  return sendEmail(teamEmail, `[FMAE-TMS] Welcome to ${data.competition_name} — Registration Approved!`, html);
}

// ─── EMAIL TRIGGER 3: Registration Rejected → Team ───────────────────────────
async function sendRegistrationRejected(teamEmail, data) {
  const html = htmlWrap(`
    <h2 style="color:#fff;">Registration Update — Action Required</h2>
    <p style="color:#aaa;">We regret to inform you that your registration for <strong>${data.competition_name}</strong> has not been approved at this time.</p>
    <div style="background:#111; border:1px solid #333; border-radius:6px; padding:20px; margin:20px 0;">
      <p style="margin:0 0 8px; color:#aaa; font-size:12px; letter-spacing:1px;">REASON FOR REJECTION</p>
      <p style="margin:0; color:#fff;">${data.reason}</p>
    </div>
    <h3 style="color:#fff;">What You Can Do:</h3>
    <ul style="color:#aaa; line-height:1.8;">
      <li>Review the rejection reason carefully</li>
      <li>Submit a new registration with the corrected information</li>
      <li>Contact support at <a href="mailto:support@fmae.in" style="color:#fff;">support@fmae.in</a> for clarification</li>
    </ul>
    <a href="${process.env.FRONTEND_URL}/register"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px;">
      Register Again →
    </a>
  `);
  return sendEmail(teamEmail, `[FMAE-TMS] Registration Update — ${data.competition_name}`, html);
}

// ─── EMAIL TRIGGER 4: Task Published → All Teams in Competition ──────────────
async function sendTaskPublished(teamEmails, task) {
  const html = htmlWrap(`
    <h2 style="color:#fff;">New Task Published</h2>
    <p style="color:#aaa;">A new task has been published for your competition.</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      <tr><td style="padding:8px 0; border-bottom:1px solid #222; color:#aaa; width:140px;">Task Name</td>
          <td style="padding:8px 0; border-bottom:1px solid #222; font-weight:bold;">${task.name}</td></tr>
      <tr><td style="padding:8px 0; border-bottom:1px solid #222; color:#aaa;">Type</td>
          <td style="padding:8px 0; border-bottom:1px solid #222;">${task.task_type}</td></tr>
      <tr><td style="padding:8px 0; border-bottom:1px solid #222; color:#aaa;">Due Date</td>
          <td style="padding:8px 0; border-bottom:1px solid #222;">${task.due_date || 'Event Day'}</td></tr>
      <tr><td style="padding:8px 0; color:#aaa;">Progress Weight</td>
          <td style="padding:8px 0;">${task.weight}%</td></tr>
    </table>
    ${task.description ? `<p style="color:#aaa;">${task.description}</p>` : ''}
    <a href="${process.env.FRONTEND_URL}/team/dashboard"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px;">
      View Task →
    </a>
  `);
  const promises = teamEmails.map(email =>
    sendEmail(email, `[FMAE-TMS] New Task Published: ${task.name}`, html)
  );
  return Promise.all(promises);
}

// ─── EMAIL TRIGGER 5: Track Event Value Entered → Team ───────────────────────
async function sendTrackValueEntered(teamEmail, data) {
  const html = htmlWrap(`
    <h2 style="color:#fff;">Track Event Value Recorded</h2>
    <p style="color:#aaa;">An admin has recorded your track event value. Please review and approve it.</p>
    <div style="background:#111; border:2px solid #fff; border-radius:6px; padding:20px; margin:20px 0; text-align:center;">
      <p style="margin:0 0 8px; color:#aaa; font-size:12px; letter-spacing:1px;">${data.task_name}</p>
      <p style="margin:0; font-size:32px; font-weight:bold;">${data.value} <span style="font-size:14px; color:#aaa;">${data.unit || ''}</span></p>
    </div>
    <div style="background:#1a1a00; border:1px solid #555500; border-radius:6px; padding:16px; margin:20px 0;">
      <p style="margin:0; color:#ffff00; font-size:13px;">⚠️ CAUTION: Once you approve this value, it cannot be changed or disputed.</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/team/dashboard"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px;">
      Review & Approve →
    </a>
  `);
  return sendEmail(teamEmail, `[FMAE-TMS] Track Event Value Recorded: ${data.task_name}`, html);
}

// ─── EMAIL TRIGGER 6: Payment Marked Paid → Team ─────────────────────────────
async function sendPaymentConfirmation(teamEmail, data) {
  const html = htmlWrap(`
    <h2 style="color:#fff;">Payment Confirmed ✓</h2>
    <p style="color:#aaa;">Your registration fee for <strong>${data.competition_name}</strong> has been marked as received.</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      <tr><td style="padding:8px 0; border-bottom:1px solid #222; color:#aaa; width:140px;">Team</td>
          <td style="padding:8px 0; border-bottom:1px solid #222;">${data.team_name}</td></tr>
      <tr><td style="padding:8px 0; border-bottom:1px solid #222; color:#aaa;">Competition</td>
          <td style="padding:8px 0; border-bottom:1px solid #222;">${data.competition_name}</td></tr>
      <tr><td style="padding:8px 0; color:#aaa;">Status</td>
          <td style="padding:8px 0; font-weight:bold; color:#00ff00;">PAID</td></tr>
    </table>
    <p style="color:#aaa; font-size:13px;">Your payment status will now show as PAID on your team dashboard.</p>
    <a href="${process.env.FRONTEND_URL}/team/dashboard"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px;">
      View Dashboard →
    </a>
  `);
  return sendEmail(teamEmail, `[FMAE-TMS] Payment Confirmed — ${data.competition_name}`, html);
}

// ─── EMAIL TRIGGER 7 (Gap Fix): Task Edited After Submission → Teams ─────────
async function sendTaskEditedResubmit(teamEmail, data) {
  const html = htmlWrap(`
    <h2 style="color:#fff;">⚠️ Task Updated — Resubmission Required</h2>
    <p style="color:#aaa;">The admin has updated a task that you have already submitted. You are required to resubmit.</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      <tr><td style="padding:8px 0; border-bottom:1px solid #222; color:#aaa; width:140px;">Task Name</td>
          <td style="padding:8px 0; border-bottom:1px solid #222; font-weight:bold;">${data.task_name}</td></tr>
      <tr><td style="padding:8px 0; color:#aaa;">New Due Date</td>
          <td style="padding:8px 0;">${data.new_due_date || 'See Dashboard'}</td></tr>
    </table>
    <p style="color:#aaa; font-size:13px;">Your previous submission has been invalidated. Please resubmit with the updated requirements.</p>
    <a href="${process.env.FRONTEND_URL}/team/dashboard"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px;">
      Resubmit Now →
    </a>
  `);
  return sendEmail(teamEmail, `[FMAE-TMS] Action Required: Resubmit Task — ${data.task_name}`, html);
}

// ─── EMAIL TRIGGER 8 (Gap Fix): New User Created → User ─────────────────────
async function sendNewUserCreated(userEmail, data) {
  const html = htmlWrap(`
    <h2 style="color:#fff;">Welcome to FMAE-TMS</h2>
    <p style="color:#aaa;">An account has been created for you on the FMAE Team Management System.</p>
    <div style="background:#111; border:1px solid #333; border-radius:6px; padding:20px; margin:20px 0;">
      <p style="margin:0 0 8px; color:#aaa; font-size:12px; letter-spacing:1px;">YOUR ACCOUNT DETAILS</p>
      <table style="width:100%;">
        <tr><td style="color:#aaa; padding:4px 0; width:120px;">Name:</td>
            <td style="font-weight:bold;">${data.name}</td></tr>
        <tr><td style="color:#aaa; padding:4px 0;">Role:</td>
            <td style="font-weight:bold;">${data.role}</td></tr>
        <tr><td style="color:#aaa; padding:4px 0;">Email:</td>
            <td style="font-weight:bold;">${userEmail}</td></tr>
        <tr><td style="color:#aaa; padding:4px 0;">Password:</td>
            <td style="font-weight:bold; font-family:monospace; font-size:16px;">${data.temp_password}</td></tr>
      </table>
    </div>
    <p style="color:#ff4444; font-size:13px;">⚠️ Please change your password immediately after first login.</p>
    <a href="${process.env.FRONTEND_URL}/login"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px;">
      Login Now →
    </a>
  `);
  return sendEmail(userEmail, `[FMAE-TMS] Your Account Has Been Created`, html);
}

// ─── PASSWORD RESET EMAIL ─────────────────────────────────────────────────────
async function sendPasswordReset(userEmail, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const html = htmlWrap(`
    <h2 style="color:#fff;">Password Reset Request</h2>
    <p style="color:#aaa;">We received a request to reset your FMAE-TMS password. Click the button below to reset it.</p>
    <a href="${resetUrl}"
       style="display:inline-block; background:#fff; color:#000; padding:12px 24px;
              text-decoration:none; font-weight:bold; border-radius:4px; margin:20px 0;">
      Reset Password →
    </a>
    <p style="color:#666; font-size:13px;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
  `);
  return sendEmail(userEmail, `[FMAE-TMS] Password Reset Request`, html);
}

module.exports = {
  sendRegistrationSubmittedToAdmin,
  sendRegistrationConfirmationToTeam,
  sendRegistrationApproved,
  sendRegistrationRejected,
  sendTaskPublished,
  sendTrackValueEntered,
  sendPaymentConfirmation,
  sendTaskEditedResubmit,
  sendNewUserCreated,
  sendPasswordReset,
};
