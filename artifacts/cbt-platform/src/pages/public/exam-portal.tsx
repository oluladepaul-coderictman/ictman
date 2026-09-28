import * as React from "react";
import { useParams, useLocation } from "wouter";
import { useGetPublicExamInfo } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, BookOpen, Clock, Hash, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function ExamPortalPage() {
  const params = useParams<{ companySlug: string; deptSlug: string; courseCode: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data, isLoading, error } = useGetPublicExamInfo(
    params.companySlug, params.deptSlug, params.courseCode
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading exam information...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Exam Not Found</h2>
            <p className="text-gray-500">The exam link you followed is invalid or the exam is no longer available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { company, department, course, exam } = data as any;

  const isLoggedInAsCandidate = user?.role === "Candidate";
  const isCorrectCompany = true;

  const handleTakeExam = () => {
    if (!isLoggedInAsCandidate) {
      sessionStorage.setItem("cbt_exam_return", `/org/${params.companySlug}/${params.deptSlug}/${params.courseCode}`);
      setLocation("/login/candidate");
    } else if (exam) {
      setLocation(`/take-exam/${exam.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
          <p className="text-gray-500 mt-1">Online Examination Portal</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-xl">{course.title}</CardTitle>
            <p className="text-blue-100 text-sm">{course.code} {course.semester ? `· ${course.semester}` : ""}</p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Building2 className="w-5 h-5 text-blue-500" />
              <span>Department: <strong>{department.name}</strong></span>
            </div>

            {exam ? (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{exam.title}</h3>
                  {exam.description && <p className="text-gray-600 text-sm mb-3">{exam.description}</p>}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="font-semibold text-gray-900">{exam.durationMinutes} minutes</p>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">Questions</p>
                        <p className="font-semibold text-gray-900">{exam.questionCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {!isLoggedInAsCandidate ? (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-3 text-center">Log in as a candidate to take this exam</p>
                    <Button onClick={handleTakeExam} className="w-full" size="lg">
                      <LogIn className="w-4 h-4 mr-2" /> Login to Take Exam
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleTakeExam} className="w-full mt-4" size="lg">
                    Start Exam Now
                  </Button>
                )}
              </>
            ) : (
              <div className="border-t pt-4 text-center">
                <p className="text-gray-500">No active exam is currently available for this course.</p>
                <p className="text-gray-400 text-sm mt-1">Please check back later or contact your administrator.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoggedInAsCandidate && (
          <p className="text-center text-sm text-gray-500">
            Logged in as <strong>{user?.name}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
