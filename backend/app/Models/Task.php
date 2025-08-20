<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    protected $fillable = [
        'daily_page_id',
        'user_id',
        'title',
        'description',
        'is_completed',
        'completed_at',
    ];

    /**
     * @return BelongsTo<DailyPage,Task>
     */
    public function page(): BelongsTo
    {
        return $this->belongsTo(DailyPage::class, 'daily_page_id');
    }

    /**
     * @return BelongsTo<User,Task>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
