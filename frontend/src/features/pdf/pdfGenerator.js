/**
 * 📄 pdfGenerator.js
 * Dynamic PDF Receipt Generator for Emergency Ambulance Bookings
 * Renders an official, verifiable medical dispatch receipt and opens browser PDF print/save dialog.
 */

export const generateBookingReceiptPDF = (bookingData = {}) => {
  const receiptNumber = 'RCP-' + Date.now().toString().slice(-8);
  const dateFormatted = new Date().toLocaleString();

  const {
    bookingId = 'BK-108-EMG',
    patientName = 'Edward Vincent',
    patientPhone = '+91 98765 43210',
    ambulanceType = 'ADVANCED LIFE SUPPORT (ALS)',
    vehicleNumber = 'MH-01-EQ-1108',
    driverName = 'Rajesh Kumar',
    pickupAddress = 'Bandra West Junction, Mumbai',
    destinationHospital = 'Lilavati Hospital & Research Centre',
    fare = 150,
    emergencySeverity = 'CRITICAL_CODE_RED',
  } = bookingData;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Official Dispatch Receipt - ${receiptNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 40px;
          background: #fff;
        }
        .receipt-card {
          max-width: 650px;
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .brand {
          font-size: 24px;
          font-weight: 800;
          color: #1d4ed8;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .badge {
          display: inline-block;
          background: #fee2e2;
          color: #b91c1c;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
          text-transform: uppercase;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 12px;
        }
        .meta-item {
          font-size: 12px;
        }
        .meta-item label {
          color: #64748b;
          display: block;
          margin-bottom: 2px;
          font-weight: 500;
        }
        .meta-item value {
          font-weight: 700;
          color: #0f172a;
          font-size: 13px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 10px 12px;
          text-align: left;
          font-size: 13px;
        }
        th {
          background: #f1f5f9;
          color: #475569;
          font-weight: 600;
        }
        tr:not(:last-child) td {
          border-bottom: 1px solid #f1f5f9;
        }
        .total-row td {
          font-weight: 800;
          font-size: 15px;
          color: #1d4ed8;
          border-top: 2px solid #e2e8f0;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 16px;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
        }
        @media print {
          body { padding: 0; }
          .receipt-card { border: none; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <div>
            <div class="brand">🚑 LifeLink Emergency</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Smart Healthcare & Emergency Ambulance Dispatch</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">${emergencySeverity}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Receipt #${receiptNumber}</div>
            <div style="font-size: 10px; color: #94a3b8;">${dateFormatted}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <label>Patient Name</label>
            <value>${patientName}</value>
          </div>
          <div class="meta-item">
            <label>Contact Phone</label>
            <value>${patientPhone}</value>
          </div>
          <div class="meta-item">
            <label>Ambulance Unit</label>
            <value>${vehicleNumber} (${ambulanceType})</value>
          </div>
          <div class="meta-item">
            <label>Assigned Paramedic/Driver</label>
            <value>${driverName}</value>
          </div>
        </div>

        <div style="font-size: 12px; margin-bottom: 16px; line-height: 1.6;">
          <div><strong>📍 Pickup Location:</strong> ${pickupAddress}</div>
          <div><strong>🏥 Destination Hospital:</strong> ${destinationHospital}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Service Item</th>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Emergency Code-Red Dispatch</td>
              <td>Priority response & GPS real-time navigation</td>
              <td style="text-align: right;">$${fare}</td>
            </tr>
            <tr>
              <td>ALS Paramedic Onboard</td>
              <td>Oxygen support, AED & vital telemetry monitoring</td>
              <td style="text-align: right;">$0.00 (Covered)</td>
            </tr>
            <tr class="total-row">
              <td colspan="2">Total Amount Charged</td>
              <td style="text-align: right;">$${fare}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          Verified Medical Transport • 24/7 Emergency Dispatch Helpline: 108 / 102 • Prescripto Healthcare Group
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};

/**
 * 📄 generateAppointmentReceiptPDF
 * Generates official verifiable PDF Receipt for Doctor Consultation Appointments
 * Includes: Patient name, Doctor name & speciality, Date & time, Payment status, Fees.
 */
export const generateAppointmentReceiptPDF = (appointmentData = {}) => {
  const receiptNumber = 'APT-' + (appointmentData._id || appointmentData.id || Date.now().toString()).slice(-8).toUpperCase();
  const dateFormatted = new Date().toLocaleString();

  const patientName = appointmentData.userData?.name || appointmentData.patientName || 'Edward Vincent';
  const doctorName = appointmentData.docData?.name || appointmentData.doctorName || 'Dr. Richard James';
  const speciality = appointmentData.docData?.speciality || appointmentData.speciality || 'General Physician';
  const slotDate = appointmentData.slotDate || 'Tomorrow';
  const slotTime = appointmentData.slotTime || '10:00 AM';
  const amount = appointmentData.amount || appointmentData.docData?.fees || 50;
  const paymentStatus = appointmentData.payment || appointmentData.isCompleted ? 'PAID' : 'PENDING AT CLINIC';
  const status = appointmentData.cancelled ? 'CANCELLED' : (appointmentData.isCompleted ? 'COMPLETED' : 'CONFIRMED');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Prescripto Doctor Consultation Receipt - ${receiptNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 30px;
          background: #f8fafc;
        }
        .receipt-card {
          max-width: 680px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 36px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #1e2e6e;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .brand {
          font-size: 26px;
          font-weight: 900;
          color: #1e2e6e;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .brand span {
          color: #2563eb;
        }
        .badge {
          display: inline-block;
          background: #ecfdf5;
          color: #047857;
          font-size: 11px;
          font-weight: 800;
          padding: 6px 14px;
          border-radius: 9999px;
          text-transform: uppercase;
          border: 1px solid #a7f3d0;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
          background: #f8f9fd;
          padding: 20px;
          border-radius: 16px;
          border: 1px solid #eef2ff;
        }
        .meta-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .meta-val {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
        }
        th {
          background: #f1f5f9;
          text-align: left;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          border-radius: 8px;
        }
        td {
          padding: 14px;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }
        .total-row {
          font-size: 16px;
          font-weight: 900;
          color: #1e2e6e;
          background: #f8f9fd;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <div>
            <div class="brand">b<span>•</span>well <span style="font-size: 12px; color: #64748b; font-weight: 600; margin-left: 8px;">PRESCRIPTO HEALTHCARE</span></div>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Official Physician Consultation Invoice & Confirmation</p>
          </div>
          <span class="badge">${status}</span>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Receipt Number</div>
            <div class="meta-val">${receiptNumber}</div>
          </div>
          <div>
            <div class="meta-label">Generated Timestamp</div>
            <div class="meta-val">${dateFormatted}</div>
          </div>
          <div>
            <div class="meta-label">Patient Name</div>
            <div class="meta-val">${patientName}</div>
          </div>
          <div>
            <div class="meta-label">Payment Status</div>
            <div class="meta-val" style="color: ${paymentStatus === 'PAID' ? '#059669' : '#d97706'};">${paymentStatus}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Clinical Consultation</th>
              <th>Specialist Details</th>
              <th>Schedule</th>
              <th style="text-align: right;">Consultation Fee</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>In-Clinic / Online Appointment</strong><br/>
                <span style="font-size: 11px; color: #64748b;">Comprehensive Diagnosis & Digital Prescription</span>
              </td>
              <td>
                <strong>${doctorName}</strong><br/>
                <span style="font-size: 11px; color: #2563eb;">${speciality}</span>
              </td>
              <td>
                <strong>${slotDate}</strong><br/>
                <span style="font-size: 11px; color: #64748b;">Slot: ${slotTime}</span>
              </td>
              <td style="text-align: right; font-weight: 700;">$${amount}.00</td>
            </tr>
            <tr class="total-row">
              <td colspan="3">Total Billable Amount</td>
              <td style="text-align: right;">$${amount}.00</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          This is an official computer-generated receipt issued by Prescripto Healthcare.<br/>
          For inquiries or rescheduling, contact Prescripto Careline at <strong>+1-212-456-7890</strong> or email <strong>support@prescripto.com</strong>.
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};

export default { generateBookingReceiptPDF, generateAppointmentReceiptPDF };

