import express from 'express';
import { connectToDatabase } from '../lib/db.js';
import { verifyToken } from './utils.js';

const router = express.Router();

router.post('/create', verifyToken, async (req, res) => {
    let { title, description, start_date, end_date, patient, dentist, is_all_day, recurrence_rule, excluded_dates } = req.body;

    try {
        const db = await connectToDatabase();

        start_date = new Date(start_date);
        end_date = new Date(end_date);

        if (start_date >= end_date) {
            return res.status(400).json({ error: 'Start date is later than End date' });
        }

        const creation_date_time = new Date();

        if (start_date < creation_date_time) {
            return res.status(400).json({ error: 'Start date has already passed' });
        }

        if (!patient && !dentist) {
            return res.status(400).json({ error: 'No patient and dentist provided' });
        }

        let filtered_appointments = await getAppointmentsByDateRange(start_date, end_date, patient, dentist);

        if (filtered_appointments.length > 0) {
            return res.status(400).json({ error: 'There is a conflicting appointment. Adjust your selected time' });
        }

        await db.query('INSERT INTO appointments (title, description, start_date, end_date, creation_date_time, patient, dentist, is_all_day, recurrence_rule, excluded_dates) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, start_date, end_date, creation_date_time, patient, dentist, is_all_day, recurrence_rule, excluded_dates]
        );

        res.status(201).json({ message: 'Appointment created successfully' });
    }
    catch (err) {
        console.log('er', err);
        res.status(500).json(err);
    }
});


const getAppointmentsByDateRange = async (start_date, end_date, patient_id, dentist_id) => {
    try {
        const db = await connectToDatabase();

        let appointments = [];
        let filtered_appointments = [];

        if (dentist_id && !patient_id) {
            appointments = await db.query('SELECT * FROM appointments WHERE dentist = ?', [dentist_id]);
        }
        else if (patient_id && !dentist_id) {
            appointments = await db.query('SELECT * FROM appointments WHERE patient = ?', [patient_id]);
        }
        else {
            appointments = await db.query('SELECT * FROM appointments WHERE patient = ? AND dentist = ?', [patient_id, dentist_id]);
        }

        appointments = appointments[0];

        appointments.map(appointment => {
            if ((appointment.start_date >= start_date && appointment.start_date < end_date) || (appointment.end_date > start_date && appointment.end_date <= end_date) || (appointment.start_date <= start_date && appointment.end_date >= end_date)) {
                filtered_appointments.push(appointment);
            }
        });

        return filtered_appointments;
    }
    catch (err) {
        console.log('erro', err);
    }
}


router.get('/user_appointments', verifyToken, async (req, res) => {
    try {
        let { start_date, end_date, dentist_id, patient_id } = req.query;

        start_date = new Date(start_date);
        end_date = new Date(end_date);

        if (!start_date) {
            return res.status(400).json({ error: 'No Start date provided' });
        }

        if (!end_date) {
            return res.status(400).json({ error: 'No End date provided' });
        }

        if (start_date >= end_date) {
            return res.status(400).json({ error: 'Start date is later than End date' });
        }

        if (!patient_id && !dentist_id) {
            return res.status(400).json({ error: 'No patient and dentist provided' });
        }

        let filtered_appointments = await getAppointmentsByDateRange(start_date, end_date, patient_id, dentist_id);

        return res.status(200).json({ appointments: filtered_appointments });
    }
    catch (err) {
        return res.status(500).json({ error: err });
    }
});


router.put('/:id', verifyToken, async (req, res) => {
    try {
        const appointmentId = Number(req.params.id);

        const db = await connectToDatabase();
        const [rows] = await db.query('SELECT * FROM appointments WHERE id = ?', [appointmentId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Appointment with this id does not exist' });
        }

        let { title, description, start_date, end_date, patient, dentist, is_all_day, recurrence_rule, excluded_dates } = req.body;

        start_date = new Date(start_date);
        end_date = new Date(end_date);

        if (start_date >= end_date) {
            return res.status(400).json({ error: 'Start date is later than End date' });
        }

        if (start_date < new Date()) {
            return res.status(400).json({ error: 'Start date has already passed' });
        }

        if (!patient && !dentist) {
            return res.status(400).json({ error: 'No patient and dentist provided' });
        }

        let filtered_appointments = await getAppointmentsByDateRange(start_date, end_date, patient, dentist);
        filtered_appointments = filtered_appointments.filter(app => app.id !== appointmentId);

        if (filtered_appointments.length > 0) {
            return res.status(400).json({ error: 'There is a conflicting appointment. Adjust your selected time' });
        }

        await db.query('UPDATE appointments SET title = ?, description = ?, start_date = ?, end_date = ?, is_all_day = ?, recurrence_rule = ?, excluded_dates = ? WHERE id = ?',
            [title, description, start_date, end_date, is_all_day, recurrence_rule, excluded_dates, appointmentId]
        );

        return res.status(200).json({ message: 'Appointment details updated successfully' });
    }
    catch (err) {
        return res.status(500).json({ error: err });
    }
});


router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const appointmentId = Number(req.params.id);

        const db = await connectToDatabase();
        const [apps] = await db.query('SELECT * FROM appointments WHERE id = ?', [appointmentId]);

        if (apps.length === 0) {
            return res.status(404).json({ message: 'Appointment with this id does not exist' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User with this id does not exist' });
        }

        let appointment = apps[0];
        let user = users[0];

        if ((user.is_dentist && user.id !== appointment.dentist) || (!user.is_dentist && user.id !== appointment.patient)) {
            return res.status(400).json({ error: 'You do not have permissions to delete this appointment' });
        }

        await db.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);

        return res.status(200).json({ message: 'Appointment deleted successfully' });
    }
    catch (err) {
        return res.status(500).json({ error: err });
    }
});

export default router;