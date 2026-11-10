<?php

namespace App\Services;

use App\Models\Board;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Admits one student into an institution: creates the student's login and links
 * (or creates) the parent's login. Used by "New student" and by "Admit" on an application.
 *
 * Returns the logins to hand to the family. Passwords are only shown here, once.
 */
class Enrolment
{
    /**
     * @param array{name:string, board:?string, cls:?string, admission_no?:?string, dob?:?string, email?:?string,
     *              parent_name?:?string, parent_phone?:?string, parent_email?:?string, password?:?string, batch_id?:?int} $d
     * @return array{student: User, credentials: array<int, array{who:string, name:string, login:string, password:?string}>}
     */
    public function admit(Tenant $tenant, array $d): array
    {
        return DB::transaction(function () use ($tenant, $d) {
            [$boardId, $classId] = $this->place($d['board'] ?? null, $d['cls'] ?? null);

            $admissionNo = trim((string) ($d['admission_no'] ?? '')) ?: $this->nextAdmissionNo($tenant);
            if (User::where('tenant_id', $tenant->id)->where('admission_no', $admissionNo)->exists()) {
                throw ValidationException::withMessages(['admission_no' => ["Admission no. {$admissionNo} is already used in this institution."]]);
            }
            $email = isset($d['email']) && $d['email'] ? strtolower($d['email']) : null;
            if ($email && User::where('email', $email)->exists()) {
                throw ValidationException::withMessages(['email' => ['This email already has an account.']]);
            }

            $studentPassword = ($d['password'] ?? null) ?: $this->password();
            $student = User::create([
                'tenant_id' => $tenant->id, 'name' => trim($d['name']), 'role' => 'student',
                'admission_no' => $admissionNo, 'email' => $email,
                'age' => isset($d['dob']) && $d['dob'] ? (int) now()->diffInYears($d['dob'], true) : null,
                'board_id' => $boardId, 'class_id' => $classId, 'password' => $studentPassword,
            ]);
            $credentials = [['who' => 'student', 'name' => $student->name, 'login' => $admissionNo, 'password' => $studentPassword]];

            // Parent: reuse their account if they already have one here (e.g. a sibling studies here)
            $phone = isset($d['parent_phone']) && $d['parent_phone'] ? Phone::normalize($d['parent_phone']) : null;
            if ($phone || ! empty($d['parent_name'])) {
                $parent = $phone ? User::where('phone', $phone)->first() : null;
                if ($parent && ($parent->tenant_id !== $tenant->id || $parent->role !== 'parent')) {
                    throw ValidationException::withMessages(['parent_phone' => ['This phone number is already used by another account.']]);
                }
                if ($parent) {
                    $credentials[] = ['who' => 'parent', 'name' => $parent->name, 'login' => $parent->phone ?? $parent->email, 'password' => null];
                } else {
                    $parentEmail = isset($d['parent_email']) && $d['parent_email'] ? strtolower($d['parent_email']) : null;
                    if ($parentEmail && User::where('email', $parentEmail)->exists()) {
                        throw ValidationException::withMessages(['parent_email' => ['This email already has an account.']]);
                    }
                    $parentPassword = $this->password();
                    $parent = User::create([
                        'tenant_id' => $tenant->id, 'name' => trim($d['parent_name'] ?? 'Parent of '.$student->name), 'role' => 'parent',
                        'phone' => $phone, 'email' => $parentEmail, 'password' => $parentPassword,
                    ]);
                    if ($phone || $parentEmail) {
                        $credentials[] = ['who' => 'parent', 'name' => $parent->name, 'login' => $phone ?? $parentEmail, 'password' => $parentPassword];
                    }
                }
                $student->forceFill(['parent_id' => $parent->id])->save();
            }

            if (! empty($d['batch_id'])) {
                $batch = \App\Models\Batch::where('tenant_id', $tenant->id)->find($d['batch_id']);
                $batch?->students()->syncWithoutDetaching([$student->id]);
            }

            return ['student' => $student, 'credentials' => $credentials];
        });
    }

    /** Board code (AP / EK / GEN) and class label (5, +1) → ids. */
    private function place(?string $board, ?string $cls): array
    {
        if (! $board) {
            return [null, null];
        }
        $b = Board::where('code', strtoupper(explode(' ', trim($board))[0]))->first();
        $c = $b && $cls ? $b->classes()->where('label', trim($cls))->first() : null;

        return [$b?->id, $c?->id];
    }

    private function nextAdmissionNo(Tenant $tenant): string
    {
        $n = User::where('tenant_id', $tenant->id)->where('role', 'student')->count() + 1;
        do {
            $no = $tenant->code.'-'.str_pad((string) $n++, 4, '0', STR_PAD_LEFT);
        } while (User::where('tenant_id', $tenant->id)->where('admission_no', $no)->exists());

        return $no;
    }

    private function password(): string
    {
        return 'Noon-'.Str::password(8, symbols: false);
    }
}
