'use client';

export default function ProfilePage() {
  // ID e nome do usuário atual (será substituído por conta logada futuramente)
  const currentUserId = 'default-user';
  const currentUserName = 'Usuário';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50 mb-2">
            Perfil
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Informações da sua conta
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-zinc-500 dark:text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                {currentUserName}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                ID: {currentUserId}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              A funcionalidade de perfil será expandida futuramente com autenticação e mais opções.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

