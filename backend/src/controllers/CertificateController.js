const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const path = require('path');
const logger = require('../utils/logger');

// GET /api/certificates/download — Team: Download certificate
const downloadCertificate = async (req, res) => {
  const teamId = req.user.id;

  // Check if team has completed all tasks
  const regResult = await pool.query(
    `SELECT r.*, c.name as competition_name
     FROM registrations r JOIN competitions c ON c.id = r.competition_id
     WHERE r.team_user_id = $1 AND r.status = 'APPROVED'`,
    [teamId]
  );
  if (!regResult.rows[0]) return res.status(404).json({ success: false, message: 'Registration not found' });
  const reg = regResult.rows[0];

  const tasksCount = await pool.query(
    `SELECT COUNT(*) FROM tasks WHERE competition_id = $1 AND status = 'PUBLISHED'`,
    [reg.competition_id]
  );
  const completedCount = await pool.query(
    `SELECT COUNT(*) FROM (
       SELECT task_id FROM submissions WHERE team_id = $1 AND status IN ('SUBMITTED','VIEWED')
       UNION
       SELECT task_id FROM track_events WHERE team_id = $1 AND approved = TRUE
     ) as completed`,
    [teamId]
  );

  const total = parseInt(tasksCount.rows[0].count);
  const completed = parseInt(completedCount.rows[0].count);

  if (completed < total && total > 0) {
    return res.status(403).json({ success: false, message: `Incomplete. You have completed ${completed}/${total} tasks.` });
  }

  // Generate PDF
  const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
  const filename = `Certificate_${reg.team_name.replace(/\s+/g, '_')}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  doc.pipe(res);

  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
  
  // Border
  doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80).lineWidth(2).stroke('#000000');
  doc.rect(50, 50, doc.page.width - 100, doc.page.height - 100).lineWidth(1).stroke('#cccccc');

  // Content
  doc.font('Helvetica-Bold').fontSize(48).fill('#000000').text('CERTIFICATE', 0, 140, { align: 'center' });
  doc.font('Helvetica').fontSize(18).fill('#666666').text('OF PARTICIPATION', 0, 200, { align: 'center' });

  doc.moveDown(2);
  doc.font('Helvetica').fontSize(14).fill('#333333').text('This is to certify that team', { align: 'center' });
  
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(32).fill('#000000').text(reg.team_name.toUpperCase(), { align: 'center' });
  
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(14).fill('#333333').text(`from ${reg.college_name}`, { align: 'center' });

  doc.moveDown(1.5);
  doc.font('Helvetica').fontSize(14).text('has successfully participated in the', { align: 'center' });
  doc.font('Helvetica-Bold').fontSize(18).text(reg.competition_name, { align: 'center' });
  
  doc.moveDown(2);
  doc.font('Helvetica').fontSize(12).fill('#999999').text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 100, 450);
  
  doc.font('Helvetica-Bold').fontSize(14).fill('#000000').text('FMAE Core Team', 600, 450);
  doc.fontSize(10).fill('#666666').text('Authorized Signatory', 600, 465);

  doc.end();
  logger.info(`Certificate generated for team ${reg.team_name}`);
};

module.exports = { downloadCertificate };
