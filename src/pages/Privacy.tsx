import { EVENT_CONFIG } from '@/config/event';
import { Shield, Lock, Trash2, Mail, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-aws-orange/10 border border-aws-orange/20 flex items-center justify-center mx-auto text-aws-orange">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-white">
          Privacy Policy & Data Transparency
        </h1>
        <p className="text-sm text-slate-400">
          Last updated: October 2026 · {EVENT_CONFIG.organizer}
        </p>
      </div>

      <div className="card space-y-6 text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-aws-orange" />
            1. Why We Collect Your Information
          </h2>
          <p>
            The <strong>{EVENT_CONFIG.name}</strong> is an offline, curated community event. Because tickets are 100% free but physical seating is strictly limited to 300 builders, we review applications to prevent fraudulent bookings, seat hoarding, and unverified entries.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-aws-orange" />
            2. Data We Collect & How It Is Protected
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
            <li><strong>Identity:</strong> Name, Google email address, and WhatsApp mobile number.</li>
            <li><strong>Academic / Work:</strong> Role, college or organization name, branch, and student ID roll number.</li>
            <li><strong>ID Proof:</strong> Compressed photo of your college or employee ID card. Stored exclusively in an encrypted, private Supabase Storage bucket with zero public access. Only vetted reviewers can view it via temporary signed URLs (60-minute expiry).</li>
            <li><strong>Motivation Answers:</strong> Your cloud experience level and what you want to build at re:Invent.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-aws-orange" />
            3. Zero Third-Party Selling or Commercial Use
          </h2>
          <p>
            We will never sell, rent, or trade your personal data. Your contact details are strictly utilized to send your digital entry badge, event announcements, and logistical instructions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-aws-orange" />
            4. Data Retention & Right to Deletion
          </h2>
          <p>
            You have the right to inspect, correct, or permanently erase your application records at any time. If you wish to purge all stored details and ID card images before or after the event, email us directly at{' '}
            <a href={`mailto:${EVENT_CONFIG.contactEmail}`} className="text-aws-orange underline">
              {EVENT_CONFIG.contactEmail}
            </a>
            .
          </p>
        </section>
      </div>

      <div className="text-center pt-4">
        <Link to="/apply" className="btn-primary text-sm">
          Return to Application
        </Link>
      </div>
    </div>
  );
}
