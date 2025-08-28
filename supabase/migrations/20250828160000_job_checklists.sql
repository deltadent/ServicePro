-- Migration: Job Checklists Feature
-- Description: Creates tables for job checklist templates and job checklists
-- Created: 2025-08-28

-- Create job checklist templates table
create table if not exists job_checklist_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    items jsonb not null default '[]'::jsonb,
    is_active boolean default true,
    created_by uuid references profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create job checklists table
create table if not exists job_checklists (
    id uuid primary key default gen_random_uuid(),
    job_id uuid references jobs(id) on delete cascade not null,
    template_id uuid references job_checklist_templates(id) on delete set null,
    template_name text, -- Store template name at time of creation for reference
    items jsonb not null default '[]'::jsonb,
    completed_count int default 0,
    total_count int default 0,
    created_by uuid references profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create unique constraint for upsert operations (required for ON CONFLICT)
alter table job_checklists add constraint unique_job_checklists_job_id unique(job_id);

-- Create index for efficient job checklist lookups
create index if not exists idx_job_checklists_job_id on job_checklists(job_id);
create index if not exists idx_job_checklists_template_id on job_checklists(template_id);
create index if not exists idx_job_checklist_templates_active on job_checklist_templates(is_active) where is_active = true;

-- Enable RLS (Row Level Security)
alter table job_checklist_templates enable row level security;
alter table job_checklists enable row level security;

-- Create RLS policies for job_checklist_templates
create policy "Users can view active checklist templates" on job_checklist_templates
    for select using (is_active = true);

create policy "Admin users can manage checklist templates" on job_checklist_templates
    for all using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Create RLS policies for job_checklists
create policy "Users can view checklists for jobs they have access to" on job_checklists
    for select using (
        exists (
            select 1 from jobs
            where jobs.id = job_checklists.job_id
            and (
                jobs.technician_id = auth.uid()
                or exists (
                    select 1 from profiles
                    where profiles.id = auth.uid()
                    and profiles.role = 'admin'
                )
            )
        )
    );

create policy "Users can update checklists for jobs they have access to" on job_checklists
    for update using (
        exists (
            select 1 from jobs
            where jobs.id = job_checklists.job_id
            and (
                jobs.technician_id = auth.uid()
                or exists (
                    select 1 from profiles
                    where profiles.id = auth.uid()
                    and profiles.role = 'admin'
                )
            )
        )
    );

create policy "Users can insert checklists for jobs they have access to" on job_checklists
    for insert with check (
        exists (
            select 1 from jobs
            where jobs.id = job_checklists.job_id
            and (
                jobs.technician_id = auth.uid()
                or exists (
                    select 1 from profiles
                    where profiles.id = auth.uid()
                    and profiles.role = 'admin'
                )
            )
        )
    );

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger update_job_checklist_templates_updated_at
    before update on job_checklist_templates
    for each row execute function update_updated_at_column();

create trigger update_job_checklists_updated_at
    before update on job_checklists
    for each row execute function update_updated_at_column();

-- Insert some sample checklist templates
insert into job_checklist_templates (name, description, items) values
(
    'AC Maintenance Standard Checklist',
    'Standard checklist for air conditioning maintenance jobs',
    '[
        {"id": "pre_inspection", "text": "Pre-inspection - Check system condition", "required": true},
        {"id": "filter_check", "text": "Check and clean/replace air filters", "required": true},
        {"id": "coil_clean", "text": "Clean evaporator and condenser coils", "required": true},
        {"id": "drainage_check", "text": "Check drainage system and condensate removal", "required": true},
        {"id": "refrigerant_check", "text": "Check refrigerant levels and pressures", "required": true},
        {"id": "blower_motor", "text": "Inspect blower motor and bearings", "required": true},
        {"id": "electrical_check", "text": "Verify electrical connections and controls", "required": true},
        {"id": "performance_test", "text": "Test system performance and air flow", "required": true},
        {"id": "customer_demo", "text": "Demonstrate system operation to customer", "required": false}
    ]'::jsonb
),
(
    'Plumbing Service Checklist',
    'Standard checklist for plumbing service calls',
    '[
        {"id": "visual_inspection", "text": "Visual inspection of plumbing system", "required": true},
        {"id": "pressure_test", "text": "Test water pressure and flow rates", "required": true},
        {"id": "leak_check", "text": "Check for leaks in pipes and fittings", "required": true},
        {"id": "drain_clean", "text": "Clear drains and check for blockages", "required": true},
        {"id": "fixture_check", "text": "Inspect faucets, valves, and fixtures", "required": true},
        {"id": "water_heater", "text": "Check water heater functionality", "required": false},
        {"id": "pipe_inspection", "text": "Inspect visible pipes for corrosion/wear", "required": false},
        {"id": "customer_explanation", "text": "Explain findings and recommendations to customer", "required": true}
    ]'::jsonb
),
(
    'Electrical Service Checklist',
    'Standard checklist for electrical service jobs',
    '[
        {"id": "safety_check", "text": "Perform safety assessment and lockout procedures", "required": true},
        {"id": "voltage_test", "text": "Test electrical voltages and current", "required": true},
        {"id": "wiring_inspect", "text": "Inspect wiring and connections", "required": true},
        {"id": "breaker_panel", "text": "Check breaker panel and fuses", "required": true},
        {"id": "grounding_verify", "text": "Verify proper grounding", "required": true},
        {"id": "outlet_test", "text": "Test outlets and switches", "required": true},
        {"id": "lighting_check", "text": "Check lighting circuits and fixtures", "required": false},
        {"id": "code_compliance", "text": "Verify code compliance and safety standards", "required": true}
    ]'::jsonb
);

-- Add comment for documentation
comment on table job_checklist_templates is 'Templates for predefined checklists that can be applied to jobs';
comment on table job_checklists is 'Checklists associated with specific jobs, populated from templates or custom items';