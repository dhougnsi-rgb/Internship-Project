"""Initial migration

Revision ID: 599dff71fa05
Revises: 
Create Date: 2026-09-24 15:50:43.680542

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '599dff71fa05'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ── users ──────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="patient"),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── patients ───────────────────────────────────────────────────────────
    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(), nullable=False, server_default="Ambulatoire"),
        sa.Column("motif", sa.Text(), nullable=True),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("last_visit", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_patients_id", "patients", ["id"], unique=False)
    op.create_index("ix_patients_user_id", "patients", ["user_id"], unique=False)
    op.create_index("ix_patients_email", "patients", ["email"], unique=False)

    # ── staff ──────────────────────────────────────────────────────────────
    op.create_table(
        "staff",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("department", sa.String(), nullable=True),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_staff_id", "staff", ["id"], unique=False)

    # ── consultations ──────────────────────────────────────────────────────
    op.create_table(
        "consultations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=True),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        sa.Column("patient_nom", sa.String(), nullable=False),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("sexe", sa.String(), nullable=True),
        sa.Column("service", sa.String(), nullable=True),
        sa.Column("medecin", sa.String(), nullable=True),
        sa.Column("heure", sa.String(), nullable=True),
        sa.Column("motif", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="En attente"),
        sa.Column("urgent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("dossier", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("diagnostic", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_consultations_id", "consultations", ["id"], unique=False)
    op.create_index("ix_consultations_appointment_id", "consultations", ["appointment_id"], unique=True)

    # ── appointments ──────────────────────────────────────────────────────
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=True),
        sa.Column("patient_name", sa.String(), nullable=False),
        sa.Column("patient_avatar", sa.String(), nullable=True),
        sa.Column("patient_category", sa.String(), nullable=True),
        sa.Column("requested_date", sa.String(), nullable=False),
        sa.Column("requested_time", sa.String(), nullable=False),
        sa.Column("ai_assessment", sa.String(), nullable=True),
        sa.Column("ai_symptoms", sa.Text(), nullable=True),
        sa.Column("ai_confidence", sa.Float(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("new_date", sa.String(), nullable=True),
        sa.Column("new_time", sa.String(), nullable=True),
        sa.Column("review_status", sa.String(), nullable=True, server_default="pending"),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_appointments_id", "appointments", ["id"], unique=False)
    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"], unique=False)

    # ── messages ──────────────────────────────────────────────────────────
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("receiver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_messages_id", "messages", ["id"], unique=False)

    # ── translations ──────────────────────────────────────────────────────
    op.create_table(
        "translations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("langue_source", sa.String(), nullable=False),
        sa.Column("langue_cible", sa.String(), nullable=False),
        sa.Column("type_entree", sa.String(), nullable=True),
        sa.Column("message_original", sa.Text(), nullable=True),
        sa.Column("transcription", sa.Text(), nullable=True),
        sa.Column("traduction", sa.Text(), nullable=True),
        sa.Column("audio_source", sa.Text(), nullable=True),
        sa.Column("audio_traduction", sa.Text(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_translations_id", "translations", ["id"], unique=False)
    op.create_index("ix_translations_user_id", "translations", ["user_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("translations")
    op.drop_table("messages")
    op.drop_table("appointments")
    op.drop_table("consultations")
    op.drop_table("staff")
    op.drop_table("patients")
    op.drop_table("users")
