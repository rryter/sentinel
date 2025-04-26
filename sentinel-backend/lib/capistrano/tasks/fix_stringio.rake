require 'stringio'

namespace :deploy do
  task :fix_stringio do
    # This task exists only to require stringio before git tasks run
  end
end
