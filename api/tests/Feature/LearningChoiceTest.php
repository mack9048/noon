<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Madrasa Support: the learner chooses board + syllabus once; a returning guest keeps it. */
class LearningChoiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_choose_board_and_syllabus_then_switch(): void
    {
        $this->seed(CatalogSeeder::class);
        $board = Board::where('code', 'AP')->first();
        $u = User::factory()->create(['role' => 'guest']);
        $this->actingAs($u)->putJson('/api/me/learning', ['board_id' => $board->id, 'syllabus' => 'english'])
            ->assertOk()->assertJsonPath('board_id', $board->id)->assertJsonPath('syllabus', 'english');
        $en = $board->classes()->where('syllabus', 'english')->where('label', '5')->first();
        $this->actingAs($u)->putJson('/api/me/learning', ['class_id' => $en->id])->assertOk()->assertJsonPath('class_id', $en->id);
        // Switching syllabus drops a class from the other syllabus.
        $this->actingAs($u)->putJson('/api/me/learning', ['syllabus' => 'general'])->assertOk()
            ->assertJsonPath('syllabus', 'general')->assertJsonPath('class_id', null);
        $this->getJson("/api/boards/{$board->id}/classes?syllabus=english")->assertOk()->assertJsonCount(12);
    }

    public function test_older_app_medium_still_works(): void
    {
        $this->seed(CatalogSeeder::class);
        $board = Board::where('code', 'EK')->first();
        $u = User::factory()->create(['role' => 'guest']);
        $this->actingAs($u)->putJson('/api/me/learning', ['board_id' => $board->id, 'medium' => 'en'])
            ->assertOk()->assertJsonPath('syllabus', 'english')->assertJsonPath('medium', 'en');
        $this->getJson("/api/boards/{$board->id}/classes?medium=en")->assertOk()->assertJsonPath('0.syllabus', 'english');
    }
}
