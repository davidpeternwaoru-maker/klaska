-- Indexes on foreign keys / lookup columns used by teacher & HOD scoping,
-- so those queries stay fast as data grows.
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");
CREATE INDEX "Class_departmentId_idx" ON "Class"("departmentId");
CREATE INDEX "Staff_schoolId_role_idx" ON "Staff"("schoolId", "role");
CREATE INDEX "Staff_departmentId_idx" ON "Staff"("departmentId");
