import { Router } from 'express';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmergencyAlertToContacts } from '../utils/smsService';

const router = Router();

// GET /api/emergency-contacts - Get all emergency contacts and custom alert message
router.get('/', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const contacts = await prisma.emergencyContact.findMany({
      where: { patientId: req.user.id },
      orderBy: { createdAt: 'asc' },
    });

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: req.user.id },
      select: { customAlertMessage: true },
    });

    return res.json({
      contacts,
      count: contacts.length,
      maxAllowed: 3,
      customAlertMessage: profile?.customAlertMessage || null,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch emergency contacts' });
  }
});

// POST /api/emergency-contacts - Add an emergency contact (capped strictly at 3)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { name, phone, relation } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Contact name and phone number are required' });
  }

  try {
    const count = await prisma.emergencyContact.count({
      where: { patientId: req.user.id },
    });

    if (count >= 3) {
      return res.status(400).json({
        message: 'Maximum limit of 3 emergency contacts reached. Please remove an existing contact to add a new one.',
      });
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        patientId: req.user.id,
        name: name.trim(),
        phone: phone.trim(),
        relation: relation ? String(relation).trim() : null,
      },
    });

    return res.status(201).json(contact);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to add emergency contact' });
  }
});

// PUT /api/emergency-contacts/:id - Update an emergency contact
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const { name, phone, relation } = req.body;

  try {
    const existing = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!existing || existing.patientId !== req.user.id) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }

    const updated = await prisma.emergencyContact.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(relation !== undefined && { relation: relation ? String(relation).trim() : null }),
      },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to update emergency contact' });
  }
});

// DELETE /api/emergency-contacts/:id - Delete an emergency contact
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const existing = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!existing || existing.patientId !== req.user.id) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }

    await prisma.emergencyContact.delete({ where: { id } });

    return res.json({ message: 'Emergency contact deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to delete emergency contact' });
  }
});

// PUT /api/emergency-contacts/alert-message - Save custom alert message
router.put('/alert-message', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { customAlertMessage } = req.body;

  try {
    // Upsert patient profile if needed
    const profile = await prisma.patientProfile.upsert({
      where: { userId: req.user.id },
      update: {
        customAlertMessage: customAlertMessage ? String(customAlertMessage).trim() : null,
      },
      create: {
        userId: req.user.id,
        bloodGroup: 'O+',
        emergencyContactName: 'Self',
        emergencyContactPhone: '',
        customAlertMessage: customAlertMessage ? String(customAlertMessage).trim() : null,
      },
    });

    return res.json({
      message: 'Custom alert message updated successfully',
      customAlertMessage: profile.customAlertMessage,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to update custom alert message' });
  }
});

// POST /api/emergency-contacts/notify - Standalone button: "Notify My Emergency Contacts"
router.post('/notify', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { lat, lng } = req.body;

  try {
    const patient = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        patientProfile: true,
        emergencyContacts: true,
      },
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const contacts = patient.emergencyContacts;
    if (contacts.length === 0) {
      return res.status(400).json({
        message: 'No emergency contacts registered. Please add emergency contacts first.',
      });
    }

    const location = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;
    const customMessage = patient.patientProfile?.customAlertMessage;

    const dispatchResults = await sendEmergencyAlertToContacts(
      contacts.map((c) => ({ name: c.name, phone: c.phone })),
      patient.name,
      customMessage,
      location
    );

    return res.json({
      message: `Emergency SMS dispatched to ${contacts.length} contact(s)`,
      results: dispatchResults,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to notify emergency contacts' });
  }
});

export default router;
