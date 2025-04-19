export interface ApiV1ProjectsPostRequest {
  project: {
    name: string;
    repository_url: string;
  };
} 