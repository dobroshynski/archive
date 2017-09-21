var fs = require('fs');
var path = require('path');

var GitHubApi = require("github");
var github = new GitHubApi();

const Action = "" + process.argv[2]
const OrganizationName = "" + process.argv[3];
const RepoName = "" + process.argv[4];
const GitHubConfigToken = "" + process.argv[5];

// parse student list
var studentsData = (fs.readFileSync(path.join(__dirname, 'students')) + "").split("\n");
var students = studentsData.reduce(function (prev, e) {
    if (e !== "") {
        var splitUser = e.split(/\s/);
        prev[splitUser[0]] = splitUser[1];
    }
    return prev;
}, {});

// User authentication
if (GitHubConfigToken !== undefined) {
    github.authenticate({
        type: "token",
        token: GitHubConfigToken
    });
} else {
    console.log("Please provide a token while calling the script");
    process.exit(1);
}

var action = Action;
var repo = RepoName;

if (action === "close" || action === "open") {
    github.orgs.getTeams({
        org: OrganizationName,
        page: 1,
        per_page: 100
    }, getTeams);
} else {
    console.log("Invalid Operation; has to be either 'close' or 'open'");
}

function getTeams(err, res) {
    if (err) {
        return false;
    }
    for (var i = 0; i < res.data.length; i++) {
        if (students.hasOwnProperty(res.data[i].name)) {
            if(action == "close") {
              console.log('closing repo for team:', res.data[i].name);
            } else {
              console.log('opening repo for team:', res.data[i].name);
            }
            github.orgs.addTeamRepo({
                id: res.data[i].id,
                org: OrganizationName,
                repo: res.data[i].name + "-" + repo,
                permission: (action === "close") ? "pull" : "push"
            }, function (err, res) {
                if (err) {
                    console.log(err);
                }
            });
        }
    }
    if (github.hasNextPage(res)) {
        github.getNextPage(res, getTeams)
    }
}
