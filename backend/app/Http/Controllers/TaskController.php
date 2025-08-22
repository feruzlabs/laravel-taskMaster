<?php

namespace App\Http\Controllers;

use App\Models\DailyPage;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Info(
 *     title="TaskManager API",
 *     version="1.0.0"
 * )
 *
 * @OA\Server(
 *     url="/api/v1",
 *     description="v1 API"
 * )
 */
class TaskController extends Controller
{
    /**
     * @OA\Get(
     *   path="/tasks",
     *   summary="Get tasks for a date (default: today)",
     *   security={{{"sanctum":{}}}},
     *   @OA\Parameter(name="date", in="query", description="YYYY-MM-DD", required=false, @OA\Schema(type="string")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request)
    {
        $date = $request->query('date');
        $targetDate = $date ? Carbon::parse($date)->toDateString() : Carbon::today()->toDateString();

        $page = DailyPage::firstOrCreate(['date' => $targetDate]);

        $tasks = Task::where('daily_page_id', $page->id)
            ->where('user_id', $request->user()->id)
            ->with('user:id,username,email')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'date' => $page->date,
            'tasks' => $tasks,
        ]);
    }

    /**
     * @OA\Post(
     *   path="/tasks",
     *   summary="Create a task for today",
     *   security={{{"sanctum":{}}}},
     *   @OA\RequestBody(
     *      required=true,
     *      @OA\JsonContent(
     *          required={"title"},
     *          @OA\Property(property="title", type="string"),
     *          @OA\Property(property="description", type="string")
     *      )
     *   ),
     *   @OA\Response(response=201, description="Created")
     * )
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $today = Carbon::today()->toDateString();
        $page = DailyPage::firstOrCreate(['date' => $today]);

        $task = Task::create([
            'daily_page_id' => $page->id,
            'user_id' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
        ]);

        return response()->json($task, 201);
    }

    /**
     * @OA\Get(
     *   path="/tasks/{task}",
     *   summary="Get task by id",
     *   security={{{"sanctum":{}}}},
     *   @OA\Parameter(name="task", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Task $task)
    {
        return response()->json($task->load('user:id,username,email'));
    }

    /**
     * @OA\Put(
     *   path="/tasks/{task}",
     *   summary="Update task",
     *   security={{{"sanctum":{}}}},
     *   @OA\Parameter(name="task", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(
     *      @OA\JsonContent(
     *          @OA\Property(property="title", type="string"),
     *          @OA\Property(property="description", type="string"),
     *          @OA\Property(property="is_completed", type="boolean")
     *      )
     *   ),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function update(Request $request, Task $task)
    {
        if ($task->user_id !== $request->user()->id) {
            abort(403, 'Not authorized to update this task');
        }

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'is_completed' => 'sometimes|boolean',
        ]);

        $task->fill($data);
        if (array_key_exists('is_completed', $data)) {
            $task->completed_at = $data['is_completed'] ? now() : null;
        }
        $task->save();

        return response()->json($task);
    }

    /**
     * @OA\Delete(
     *   path="/tasks/{task}",
     *   summary="Delete task",
     *   security={{{"sanctum":{}}}},
     *   @OA\Parameter(name="task", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function destroy(Task $task)
    {
        if ($task->user_id !== request()->user()->id) {
            abort(403, 'Not authorized to delete this task');
        }
        $task->delete();
        return response()->json(['message' => 'Deleted']);
    }

    /**
     * @OA\Post(
     *   path="/tasks/rollover",
     *   summary="Move yesterday incomplete tasks to today",
     *   security={{{"sanctum":{}}}},
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function rolloverIncompleteToNextDay()
    {
        $yesterday = Carbon::yesterday()->toDateString();
        $yesterdayPage = DailyPage::firstOrCreate(['date' => $yesterday]);

        $today = Carbon::today()->toDateString();
        $todayPage = DailyPage::firstOrCreate(['date' => $today]);

        $incompleteTasks = Task::where('daily_page_id', $yesterdayPage->id)
            ->where('is_completed', false)
            ->get();

        DB::transaction(function () use ($incompleteTasks, $todayPage) {
            foreach ($incompleteTasks as $task) {
                Task::create([
                    'daily_page_id' => $todayPage->id,
                    'user_id' => $task->user_id,
                    'title' => $task->title,
                    'description' => $task->description,
                ]);
            }
        });

        return response()->json(['moved' => $incompleteTasks->count()]);
    }
}
