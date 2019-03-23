const simple = require("simple-mock");
const test = require("tap").test;

const homePath = `${__dirname}/../../../src`;
const client = require(`${homePath}/client.js`);
const remove = require(`${homePath}/commands/remove.js`);

const payload = {
  repository: {
    owner: {
      login: "publiclab"
    },
    name: "publiclabbot"
  },
  issue: {
    pull_request: true,
    number: 69,
    labels: [
      {name: "bug"},
      {name: "help wanted"}
    ],
    user: {
      login: "octocat"
    }
  }
};

const template = client.templates.get("labelError");
template.content = "{labels} {labelList} {exist} {beState} {action} {type}.";
client.templates.set("labelError", template);

test("Reject if self-labelling enabled with different commenter", async t => {
  client.cfg.issues.commands.label.self = true;
  const commenter = "octokitten";
  const args = "\"bug\"";

  const response = await remove.run.call(client, payload, commenter, args);

  t.is(response, false);

  t.end();
});

test("Reject if self-labelling users excludes commenter", async t => {
  client.cfg.issues.commands.label.self = {
    users: ["octocat"]
  };
  const commenter = "octokitten";
  const args = "\"bug\"";

  const response = await remove.run.call(client, payload, commenter, args);

  t.is(response, false);

  t.end();
});

test("Reject if invalid arguments were provided", async t => {
  const commenter = "octocat";
  const args = "no arguments";

  const response = await remove.run.call(client, payload, commenter, args);

  t.is(response, false);

  t.end();
});

test("Remove appropriate labels", async t => {
  client.cfg.issues.commands.label.self = false;
  const commenter = "octocat";
  const args = "\"bug\"";

  const request = simple.mock(client.issues, "replaceAllLabels")
    .resolveWith({
      code: 200
    });

  const response = await remove.run.call(client, payload, commenter, args);

  t.equals(request.lastCall.arg.owner, "publiclab");
  t.equals(request.lastCall.arg.repo, "publiclabbot");
  t.equals(request.lastCall.arg.number, 69);
  t.strictSame(request.lastCall.arg.labels, ["help wanted"]);
  t.equals(response, true);

  simple.restore();
  t.end();
});

test("Remove appropriate labels with single rejection message", async t => {
  const commenter = "octocat";
  const args = "\"help wanted\" \"test\"";

  const request = simple.mock(client.issues, "replaceAllLabels")
    .resolveWith({
      code: 200
    });

  const error = "Label \"test\" does not exist was removed from pull request.";

  const request2 = simple.mock(client.issues, "createComment")
    .resolveWith({
      data: {
        body: error
      }
    });

  const response = await remove.run.call(client, payload, commenter, args);

  t.equals(request.lastCall.arg.owner, "publiclab");
  t.equals(request.lastCall.arg.repo, "publiclabbot");
  t.equals(request.lastCall.arg.number, 69);
  t.strictSame(request.lastCall.arg.labels, ["bug"]);
  t.equals(request2.lastCall.arg.owner, "publiclab");
  t.equals(request2.lastCall.arg.repo, "publiclabbot");
  t.equals(request2.lastCall.arg.number, 69);
  t.equals(request2.lastCall.arg.body, error);
  t.equals(response.data.body, error);

  simple.restore();
  t.end();
});

test("Remove appropriate labels with multiple rejection message", async t => {
  payload.issue.pull_request = false;
  const commenter = "octocat";
  const args = "\"help wanted\" \"a\" \"b\"";

  const request = simple.mock(client.issues, "replaceAllLabels")
    .resolveWith({
      code: 200
    });

  const error = "Labels \"a\", \"b\" do not exist were removed from issue.";

  const request2 = simple.mock(client.issues, "createComment")
    .resolveWith({
      data: {
        body: error
      }
    });

  const response = await remove.run.call(client, payload, commenter, args);

  t.equals(request.lastCall.arg.owner, "publiclab");
  t.equals(request.lastCall.arg.repo, "publiclabbot");
  t.equals(request.lastCall.arg.number, 69);
  t.strictSame(request.lastCall.arg.labels, ["bug"]);
  t.equals(request2.lastCall.arg.owner, "publiclab");
  t.equals(request2.lastCall.arg.repo, "publiclabbot");
  t.equals(request2.lastCall.arg.number, 69);
  t.equals(request2.lastCall.arg.body, error);
  t.equals(response.data.body, error);

  simple.restore();
  t.end();
});
